import axios from 'axios';

/**
 * Transcribes an audio file using OpenAI's Whisper API
 * @param {File} audioFile - The audio file to transcribe
 * @param {Function} onProgress - Progress callback function
 * @param {string} apiKey - OpenAI API key
 * @returns {Promise<string>} - The transcription text
 */
export async function transcribeAudio(audioFile, onProgress = () => {}, apiKey) {
  try {
    // Check for API key
    if (!apiKey) {
      throw new Error('OpenAI API key is missing');
    }
    
    console.log(`Starting transcription of ${audioFile.name} (${(audioFile.size / (1024 * 1024)).toFixed(2)}MB)`);
    
    // Create a FormData object to send the file
    const formData = new FormData();
    formData.append('file', audioFile);
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'verbose_json');
    formData.append('timestamp_granularities', 'segment');
    
    if (onProgress) onProgress(20); // Starting API request
    
    console.log('Sending request to Whisper API...');
    
    // Make the API request
    const response = await axios.post(
      'https://api.openai.com/v1/audio/transcriptions', 
      formData,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (!progressEvent.total) return; // Skip if total is unknown
          const uploadProgress = (progressEvent.loaded / progressEvent.total) * 60;
          onProgress(20 + uploadProgress); // Upload is 60% of the progress (20-80%)
        },
      }
    );
    
    if (onProgress) onProgress(80); // Upload complete
    
    // Process the response
    console.log('Received response from Whisper API');
    const result = response.data;
    
    if (!result || !result.segments) {
      console.error('Invalid API response format:', result);
      throw new Error('Invalid response from Whisper API');
    }
    
    // Format the transcription with timestamps
    const formattedTranscription = formatTranscriptionWithTimestamps(result);
    
    if (onProgress) onProgress(100); // Processing complete
    
    return formattedTranscription;
  } catch (error) {
    console.error('Transcription failed:', error);
    if (error.response) {
      // Extract error message from OpenAI API response
      console.error('API response error:', error.response.data);
      const message = error.response.data?.error?.message || 
                     'API returned an error';
      throw new Error(`Whisper API error: ${message}`);
    }
    throw new Error(error.message || 'Failed to transcribe audio');
  }
}

/**
 * Formats the transcription with timestamps
 * @param {Object} result - The Whisper API response
 * @returns {string} - Formatted transcription with timestamps
 */
function formatTranscriptionWithTimestamps(result) {
  const segments = result.segments || [];
  let formattedText = '';
  
  segments.forEach(segment => {
    // Format timestamp as [MM:SS]
    const startTime = segment.start || 0;
    const minutes = Math.floor(startTime / 60);
    const seconds = Math.floor(startTime % 60);
    const milliseconds = Math.floor((startTime % 1) * 10);
    
    const timestamp = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}${milliseconds > 0 ? '.' + milliseconds : ''}`;
    
    // Add formatted segment
    formattedText += `[${timestamp}] ${segment.text.trim()}\n\n`;
  });
  
  return formattedText;
}