import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

// FFmpeg instance and load state
let ffmpeg = null;
let loaded = false;

/**
 * Loads FFmpeg if not already loaded
 */
async function loadFFmpeg() {
  if (loaded) return;
  
  try {
    ffmpeg = new FFmpeg();
    
    // Set up progress monitoring
    ffmpeg.on('log', ({ message }) => {
      console.log(message);
    });
    
    // Try multiple CDNs to ensure successful loading
    const cdnURLs = [
      'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd',
      'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd',
      'https://esm.sh/@ffmpeg/core@0.12.6/dist/umd'
    ];
    
    let loaded = false;
    let lastError = null;
    
    // Try each CDN until one works
    for (const baseURL of cdnURLs) {
      try {
        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });
        loaded = true;
        console.log(`FFmpeg loaded successfully from ${baseURL}`);
        break;
      } catch (error) {
        console.warn(`Failed to load FFmpeg from ${baseURL}:`, error);
        lastError = error;
      }
    }
    
    if (!loaded) {
      throw lastError || new Error('Failed to load FFmpeg from all CDNs');
    }
    
    loaded = true;
  } catch (error) {
    console.error('Failed to load FFmpeg:', error);
    throw new Error(`Failed to load audio compression tools: ${error.message}`);
  }
}

/**
 * Compresses an audio file to reduce its size using Web Audio API
 * @param {File} file - The audio file to compress
 * @param {Function} onProgress - Progress callback function
 * @returns {Promise<File>} - The compressed audio file
 */
async function compressWithWebAudio(file, onProgress = () => {}) {
  return new Promise((resolve, reject) => {
    try {
      onProgress(10); // Starting
      
      // Create audio context
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContext({
        sampleRate: 16000, // Lower sample rate for smaller file
      });
      
      // Create file reader
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          const arrayBuffer = event.target.result;
          onProgress(30);
          
          // Decode audio
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          onProgress(50);
          
          // Convert stereo to mono and downsample
          const offlineContext = new OfflineAudioContext(
            1, // Mono (1 channel)
            Math.ceil(audioBuffer.duration * 16000), // Adjust length based on new sample rate
            16000 // Lower sample rate
          );
          
          // Create buffer source
          const source = offlineContext.createBufferSource();
          source.buffer = audioBuffer;
          
          // Connect source to destination
          source.connect(offlineContext.destination);
          source.start(0);
          
          // Render audio
          const renderedBuffer = await offlineContext.startRendering();
          onProgress(80);
          
          // Convert to WAV
          const wavBlob = audioBufferToWav(renderedBuffer);
          const compressedFile = new File(
            [wavBlob], 
            file.name.replace(/\.[^/.]+$/, '.wav'), 
            { type: 'audio/wav' }
          );
          
          onProgress(100);
          resolve(compressedFile);
        } catch (error) {
          console.error('Audio processing failed:', error);
          reject(error);
        }
      };
      
      reader.onerror = (error) => {
        console.error('FileReader error:', error);
        reject(error);
      };
      
      // Read the file as ArrayBuffer
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Web Audio API error:', error);
      reject(error);
    }
  });
}

/**
 * Convert AudioBuffer to WAV format
 * @param {AudioBuffer} buffer - The audio buffer
 * @returns {Blob} - WAV blob
 */
function audioBufferToWav(buffer) {
  const numOfChannels = 1; // Mono
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  // Get audio data
  const channelData = buffer.getChannelData(0);
  
  // Convert to 16-bit PCM
  const bytesPerSample = bitDepth / 8;
  const dataLength = channelData.length * bytesPerSample;
  
  const buffer16Bit = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer16Bit);
  
  // Write WAV header
  // "RIFF" chunk
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');
  // "fmt " chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numOfChannels * bytesPerSample, true);
  view.setUint16(32, numOfChannels * bytesPerSample, true);
  view.setUint16(34, bitDepth, true);
  // "data" chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);
  
  // Write actual audio data
  const volume = 0.8; // Avoid clipping
  const index = 44;
  
  for (let i = 0; i < channelData.length; i++) {
    const sample = Math.max(-1, Math.min(1, channelData[i])) * volume;
    view.setInt16(index + i * bytesPerSample, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
  }
  
  return new Blob([buffer16Bit], { type: 'audio/wav' });
  
  // Helper function to write strings to the DataView
  function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }
}

/**
 * Compresses an audio file to reduce its size
 * First attempts to use FFmpeg, then falls back to Web Audio API if necessary
 * @param {File} file - The audio file to compress
 * @param {Function} onProgress - Progress callback function
 * @returns {Promise<File>} - The compressed audio file
 */
export async function compressAudio(file, onProgress = () => {}) {
  console.log(`Starting compression of ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)}MB)`);
  
  try {
    // Try compressing with Web Audio API first (simpler, works in more browsers)
    try {
      onProgress(5);
      console.log('Attempting compression with Web Audio API...');
      const webAudioResult = await compressWithWebAudio(file, progress => 
        onProgress(5 + progress * 0.9)
      );
      onProgress(100);
      
      console.log(`Compressed to ${(webAudioResult.size / (1024 * 1024)).toFixed(2)}MB with Web Audio API`);
      return webAudioResult;
    } catch (webAudioError) {
      console.warn('Web Audio compression failed:', webAudioError);
      
      // Fall back to FFmpeg
      try {
        console.log('Attempting compression with FFmpeg...');
        await loadFFmpeg();
        onProgress(20);
        
        // Get file extension
        const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
        const inputName = `input${extension}`;
        
        // Write the file to the virtual filesystem
        await ffmpeg.writeFile(inputName, await fetchFile(file));
        onProgress(40);
        
        // Compress to mp3 format
        await ffmpeg.exec([
          '-i', inputName,
          '-ac', '1',             // Convert to mono
          '-ar', '16000',         // Reduce sample rate to 16kHz
          '-b:a', '24k',          // Low bitrate
          'output.mp3'            // Output as MP3
        ]);
        onProgress(80);
        
        // Read the compressed file
        const data = await ffmpeg.readFile('output.mp3');
        onProgress(90);
        
        // Clean up
        await ffmpeg.deleteFile(inputName);
        await ffmpeg.deleteFile('output.mp3');
        
        const compressedFile = new File(
          [data.buffer], 
          file.name.replace(/\.[^/.]+$/, '.mp3'), 
          { type: 'audio/mp3' }
        );
        
        onProgress(100);
        console.log(`Compressed to ${(compressedFile.size / (1024 * 1024)).toFixed(2)}MB with FFmpeg`);
        return compressedFile;
      } catch (ffmpegError) {
        console.error('FFmpeg compression failed:', ffmpegError);
        throw ffmpegError; // Re-throw to be caught by outer try/catch
      }
    }
  } catch (error) {
    console.error('All compression methods failed:', error);
    // If all compression fails, return the original file
    onProgress(100);
    console.warn('Using original file as compression failed');
    return file;
  }
}