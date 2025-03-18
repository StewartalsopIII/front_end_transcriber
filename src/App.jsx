import React, { useState } from 'react';
import axios from 'axios';

function App() {
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [processingStage, setProcessingStage] = useState('');
  
  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
    }
  };
  
  const handleDragOver = (e) => {
    e.preventDefault();
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      setError('');
    }
  };
  
  const compressAudio = async (audioFile) => {
    return new Promise((resolve, reject) => {
      try {
        setProgress(10);
        setProcessingStage('Loading audio...');
        
        // Create audio context
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const audioContext = new AudioContext();
        
        // Create file reader
        const reader = new FileReader();
        
        reader.onload = async (event) => {
          try {
            const arrayBuffer = event.target.result;
            setProgress(20);
            setProcessingStage('Decoding audio...');
            
            // Decode audio
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            setProgress(30);
            
            // First, try aggressive compression
            setProcessingStage('Applying compression (8kHz, 8-bit)...');
            
            // Create offline context with very low sample rate
            const offlineContext = new OfflineAudioContext(
              1, // Mono (1 channel)
              Math.ceil(audioBuffer.duration * 8000),
              8000 // Very low sample rate for speech
            );
            
            // Create source
            const source = offlineContext.createBufferSource();
            source.buffer = audioBuffer;
            
            // Create compressor node for dynamic range compression
            const compressor = offlineContext.createDynamicsCompressor();
            compressor.threshold.value = -30;
            compressor.knee.value = 40;
            compressor.ratio.value = 20;
            compressor.attack.value = 0;
            compressor.release.value = 0.25;
            
            // Connect nodes
            source.connect(compressor);
            compressor.connect(offlineContext.destination);
            
            // Start source
            source.start(0);
            
            // Render audio
            setProgress(40);
            const renderedBuffer = await offlineContext.startRendering();
            setProgress(50);
            
            // Convert to 8-bit WAV with low volume (better compression)
            setProcessingStage('Converting to 8-bit WAV format...');
            const wavBlob = audioBufferToWav(renderedBuffer, 8, 0.5);
            const compressedFile = new File(
              [wavBlob],
              audioFile.name.replace(/\.[^/.]+$/, '.wav'),
              { type: 'audio/wav' }
            );
            
            setProgress(60);
            console.log(`Compressed: ${(audioFile.size / (1024 * 1024)).toFixed(2)}MB → ${(compressedFile.size / (1024 * 1024)).toFixed(2)}MB (${Math.round(compressedFile.size / audioFile.size * 100)}%)`);
            
            // Check if file is still too large
            if (compressedFile.size > 24.5 * 1024 * 1024) { // Using 24.5MB to be safe
              setProcessingStage('File still too large, downsampling further...');
              
              // Try extreme compression by dropping samples
              const extremeContext = new OfflineAudioContext(
                1,
                Math.ceil(audioBuffer.duration * 6000),
                6000 // Ultra low sample rate
              );
              
              const extremeSource = extremeContext.createBufferSource();
              extremeSource.buffer = audioBuffer;
              
              // Apply even stronger compression
              const extremeCompressor = extremeContext.createDynamicsCompressor();
              extremeCompressor.threshold.value = -40;
              extremeCompressor.knee.value = 30;
              extremeCompressor.ratio.value = 25;
              extremeCompressor.attack.value = 0;
              extremeCompressor.release.value = 0.1;
              
              extremeSource.connect(extremeCompressor);
              extremeCompressor.connect(extremeContext.destination);
              extremeSource.start(0);
              
              const extremeBuffer = await extremeContext.startRendering();
              setProgress(80);
              
              // Convert to 8-bit WAV with even lower quality
              const extremeWavBlob = audioBufferToWav(extremeBuffer, 8, 0.4);
              const extremeCompressedFile = new File(
                [extremeWavBlob],
                audioFile.name.replace(/\.[^/.]+$/, '_compressed.wav'),
                { type: 'audio/wav' }
              );
              
              console.log(`Ultra compressed: ${(extremeCompressedFile.size / (1024 * 1024)).toFixed(2)}MB (${Math.round(extremeCompressedFile.size / audioFile.size * 100)}%)`);
              setProcessingStage(`Ultra compressed: ${(extremeCompressedFile.size / (1024 * 1024)).toFixed(2)}MB`);
              
              // If still too large, try trimming
              if (extremeCompressedFile.size > 24.5 * 1024 * 1024) {
                setProcessingStage('Applying final compression adjustments...');
                
                // Create a version with only the first 55 minutes (if longer)
                const durationMinutes = audioBuffer.duration / 60;
                
                if (durationMinutes > 55) {
                  // Trim to 55 minutes
                  const trimmedContext = new OfflineAudioContext(
                    1,
                    Math.min(6000 * 55 * 60, extremeBuffer.length),
                    6000
                  );
                  
                  const trimmedSource = trimmedContext.createBufferSource();
                  trimmedSource.buffer = extremeBuffer;
                  trimmedSource.connect(trimmedContext.destination);
                  trimmedSource.start(0);
                  
                  const trimmedBuffer = await trimmedContext.startRendering();
                  
                  // Convert to 8-bit WAV
                  const trimmedWavBlob = audioBufferToWav(trimmedBuffer, 8, 0.4);
                  const trimmedFile = new File(
                    [trimmedWavBlob],
                    audioFile.name.replace(/\.[^/.]+$/, '_trimmed.wav'),
                    { type: 'audio/wav' }
                  );
                  
                  console.log(`Trimmed and compressed: ${(trimmedFile.size / (1024 * 1024)).toFixed(2)}MB`);
                  setProcessingStage(`Compressed to ${(trimmedFile.size / (1024 * 1024)).toFixed(2)}MB (trimmed to 55min)`);
                  
                  resolve(trimmedFile);
                } else {
                  // Try with reduced quality audio (downmix further)
                  const minQualityBlob = reduceQuality(extremeBuffer);
                  const minQualityFile = new File(
                    [minQualityBlob],
                    audioFile.name.replace(/\.[^/.]+$/, '_min_quality.wav'),
                    { type: 'audio/wav' }
                  );
                  
                  console.log(`Minimum quality: ${(minQualityFile.size / (1024 * 1024)).toFixed(2)}MB`);
                  setProcessingStage(`Compressed to ${(minQualityFile.size / (1024 * 1024)).toFixed(2)}MB (minimum quality)`);
                  
                  resolve(minQualityFile);
                }
              } else {
                resolve(extremeCompressedFile);
              }
            } else {
              resolve(compressedFile);
            }
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
        reader.readAsArrayBuffer(audioFile);
      } catch (error) {
        console.error('Web Audio API error:', error);
        reject(error);
      }
    });
  };
  
  // Function to apply extreme quality reduction
  function reduceQuality(buffer) {
    // Get audio data and skip samples
    const originalData = buffer.getChannelData(0);
    const skipFactor = 2; // Skip every other sample
    const reducedLength = Math.floor(originalData.length / skipFactor);
    const reducedData = new Float32Array(reducedLength);
    
    // Downsample by skipping samples
    for (let i = 0; i < reducedLength; i++) {
      reducedData[i] = originalData[i * skipFactor];
    }
    
    // Create WAV at minimum quality
    const sampleRate = buffer.sampleRate / skipFactor;
    return createWavBlob(reducedData, sampleRate, 8, 0.3);
  }
  
  // Helper function to create WAV blob
  function createWavBlob(samples, sampleRate, bitDepth, volumeScale) {
    const numChannels = 1;
    const bytesPerSample = bitDepth / 8;
    const dataLength = samples.length * bytesPerSample;
    
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);
    
    // Write WAV header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
    view.setUint16(32, numChannels * bytesPerSample, true);
    view.setUint16(34, bitDepth, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);
    
    // Write data
    const volume = volumeScale;
    const index = 44;
    
    if (bitDepth === 8) {
      for (let i = 0; i < samples.length; i++) {
        const sample = Math.max(-1, Math.min(1, samples[i])) * volume;
        const int8Sample = Math.floor((sample + 1) * 128);
        view.setUint8(index + i, int8Sample);
      }
    } else {
      for (let i = 0; i < samples.length; i++) {
        const sample = Math.max(-1, Math.min(1, samples[i])) * volume;
        view.setInt16(index + i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      }
    }
    
    return new Blob([buffer], { type: 'audio/wav' });
    
    function writeString(view, offset, string) {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    }
  }
  
  function audioBufferToWav(buffer, bitDepth = 16, volumeScale = 0.8) {
    return createWavBlob(buffer.getChannelData(0), buffer.sampleRate, bitDepth, volumeScale);
  }
  
  const handleTranscribe = async () => {
    if (!file) return;
    
    setIsProcessing(true);
    setProgress(0);
    setError('');
    setTranscription('');
    setProcessingStage('Preparing...');
    
    try {
      // Compress the audio if it's large
      let audioFile = file;
      
      if (file.size > 5 * 1024 * 1024) { // Compress files larger than 5MB
        try {
          setProcessingStage('Compressing audio file...');
          audioFile = await compressAudio(file);
          
          if (audioFile.size > 25 * 1024 * 1024) {
            throw new Error(`File is still too large (${(audioFile.size / (1024 * 1024)).toFixed(2)}MB) after compression. Maximum size is 25MB.`);
          }
          
          setProcessingStage(`Compression complete: ${(audioFile.size / (1024 * 1024)).toFixed(2)}MB`);
        } catch (compressionError) {
          console.error('Compression failed:', compressionError);
          throw new Error(`Compression failed: ${compressionError.message}`);
        }
      }
      
      // Create FormData for the API request
      const formData = new FormData();
      formData.append('file', audioFile);
      
      setProgress(85);
      setProcessingStage('Sending to transcription API...');
      console.log(`Sending file to API: ${audioFile.name} (${(audioFile.size / (1024 * 1024)).toFixed(2)}MB)`);
      
      // Send request to our secure API route
      const response = await axios.post(
        '/api/transcribe',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      setProgress(95);
      setProcessingStage('Processing transcription...');
      
      // Format the transcription with timestamps
      const result = response.data;
      if (!result || !result.segments) {
        throw new Error('Invalid response from Whisper API');
      }
      
      // Format the combined transcription with timestamps
      let formattedText = '';
      result.segments.forEach(segment => {
        // Format timestamp as [MM:SS]
        const startTime = segment.start || 0;
        const minutes = Math.floor(startTime / 60);
        const seconds = Math.floor(startTime % 60);
        const milliseconds = Math.floor((startTime % 1) * 10);
        
        const timestamp = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}${milliseconds > 0 ? '.' + milliseconds : ''}`;
        
        // Add formatted segment
        formattedText += `[${timestamp}] ${segment.text.trim()}\n\n`;
      });
      
      setTranscription(formattedText);
      setProgress(100);
      setProcessingStage('Complete');
    } catch (error) {
      console.error('Transcription error:', error);
      
      // Display user-friendly error message
      if (error.response) {
        // OpenAI API error
        const message = error.response.data?.error?.message || 'API returned an error';
        setError(`Whisper API error: ${message}`);
      } else {
        setError(error.message || 'Failed to transcribe audio');
      }
    } finally {
      setIsProcessing(false);
      setProcessingStage('');
    }
  };
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(transcription);
    alert('Transcription copied to clipboard!');
  };
  
  const downloadTranscription = () => {
    const blob = new Blob([transcription], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file.name.replace(/\.[^/.]+$/, '')}_transcript.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
        Whisper Transcriber
      </h1>
      <p style={{ marginBottom: '2rem' }}>
        Transcribe your audio files with timestamps using OpenAI's Whisper API
      </p>
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '0.5rem', 
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)', 
        padding: '2rem'
      }}>
        {/* File Upload Area */}
        <div 
          style={{ 
            border: '2px dashed #e5e7eb', 
            borderRadius: '0.5rem', 
            padding: '2rem', 
            textAlign: 'center',
            backgroundColor: '#f9fafb'
          }}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept=".m4a,.mp3,.wav,.ogg"
            onChange={handleFileChange}
            style={{ display: 'none' }}
            id="file-upload"
          />
          <label htmlFor="file-upload" style={{ cursor: 'pointer' }}>
            <div style={{ marginBottom: '1rem' }}>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="currentColor"
                style={{ width: '48px', height: '48px', color: file ? '#10b981' : '#9ca3af', margin: '0 auto' }}
              >
                {file ? (
                  <path d="M19.59 7L12 14.59 6.41 9H11V7H3v8h2v-4.59l7 7 9-9L19.59 7z" />
                ) : (
                  <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" />
                )}
              </svg>
            </div>
            <p style={{ marginBottom: '0.5rem', fontWeight: 500 }}>
              {file ? `File selected: ${file.name}` : 'Drag & drop your audio file here'}
            </p>
            {!file && (
              <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
                Supported formats: .m4a, .mp3, .wav, .ogg
              </p>
            )}
            {file && (
              <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                {(file.size / (1024 * 1024)).toFixed(2)} MB
                {file.size > 5 * 1024 * 1024 && (
                  <span> (will be compressed before uploading)</span>
                )}
              </p>
            )}
          </label>
        </div>
        
        {/* Error Message */}
        {error && (
          <div style={{ 
            marginTop: '1rem', 
            padding: '0.75rem', 
            backgroundColor: '#fee2e2', 
            color: '#b91c1c',
            borderRadius: '0.375rem',
            fontSize: '0.875rem'
          }}>
            {error}
          </div>
        )}
        
        {/* Progress Bar (when processing) */}
        {isProcessing && (
          <div style={{ marginTop: '1rem' }}>
            <p style={{ 
              fontSize: '0.875rem', 
              color: '#4b5563', 
              marginBottom: '0.25rem' 
            }}>
              {processingStage}
            </p>
            <div style={{ 
              backgroundColor: '#e5e7eb', 
              height: '0.5rem', 
              borderRadius: '0.25rem', 
              overflow: 'hidden' 
            }}>
              <div 
                style={{ 
                  backgroundColor: '#3b82f6', 
                  height: '100%', 
                  width: `${progress}%`, 
                  transition: 'width 0.3s ease' 
                }}
              />
            </div>
            <p style={{ 
              fontSize: '0.75rem', 
              color: '#6b7280', 
              marginTop: '0.25rem', 
              textAlign: 'right' 
            }}>
              {Math.round(progress)}%
            </p>
          </div>
        )}
        
        {/* Transcribe Button */}
        <button 
          style={{
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '0.25rem',
            padding: '0.75rem 1.5rem',
            fontWeight: 'bold',
            cursor: file ? 'pointer' : 'not-allowed',
            marginTop: '1.5rem',
            opacity: file ? 1 : 0.5
          }}
          disabled={!file || isProcessing}
          onClick={handleTranscribe}
        >
          {isProcessing ? 'Processing...' : 'Transcribe Audio'}
        </button>
        
        {/* Transcription Result */}
        {transcription && (
          <div style={{ 
            marginTop: '2rem', 
            padding: '1rem', 
            backgroundColor: '#f9fafb', 
            borderRadius: '0.375rem', 
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '1rem' 
            }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
                Transcription Result
              </h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  onClick={copyToClipboard}
                  style={{
                    padding: '0.375rem 0.75rem',
                    backgroundColor: '#f3f4f6',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.25rem',
                    fontSize: '0.875rem',
                    cursor: 'pointer'
                  }}
                >
                  Copy
                </button>
                <button 
                  onClick={downloadTranscription}
                  style={{
                    padding: '0.375rem 0.75rem',
                    backgroundColor: '#f3f4f6',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.25rem',
                    fontSize: '0.875rem',
                    cursor: 'pointer'
                  }}
                >
                  Download
                </button>
              </div>
            </div>
            <pre style={{ 
              whiteSpace: 'pre-wrap', 
              fontFamily: 'monospace', 
              backgroundColor: 'white',
              padding: '1rem',
              borderRadius: '0.25rem',
              border: '1px solid #e5e7eb',
              maxHeight: '400px',
              overflow: 'auto'
            }}>
              {transcription}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;