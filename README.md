# Whisper Transcriber

A simple web application for transcribing audio files with OpenAI's Whisper API.

## Features

- 🎤 Transcribe audio files using OpenAI's Whisper API
- 📝 Get timestamped transcription results
- 🔄 Drag and drop file uploads
- 🗜️ Automatic compression for large files

## Getting Started

### Installation

```bash
# Install dependencies
npm install
```

### Running the App

```bash
# Start the development server
npm run dev
```

Then open your browser to http://localhost:5173

### Setting your API Key

Create a `.env` file in the project root and add your OpenAI API key:

```
VITE_OPENAI_API_KEY=your_openai_api_key_here
```

## Usage

1. Drag and drop an audio file (M4A, MP3, WAV, OGG) onto the upload area
2. Click the "Transcribe Audio" button
3. Wait for the transcription to complete
4. View the timestamped transcription result

## Troubleshooting

If you encounter a blank page:
1. Make sure all dependencies are installed: `npm install`
2. Check browser console for errors
3. Try using a different browser
4. Make sure Vite is running on port 5173