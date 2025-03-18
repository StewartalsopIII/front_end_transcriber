# Whisper Transcriber

A web application for transcribing audio files with OpenAI's Whisper API, featuring client-side compression and secure backend API processing.

## Features

- 🎤 Transcribe audio files using OpenAI's Whisper API
- 📝 Get timestamped transcription results
- 🔄 Drag and drop file uploads
- 🗜️ Automatic compression for large files (up to 25MB limit)
- 🔒 Secure API key handling via serverless functions

## Getting Started

### Installation

```bash
# Install dependencies
npm install
```

### Running the App Locally

```bash
# Start the development server
npm run dev
```

Then open your browser to http://localhost:5173

### Setting your API Key

For local development, create a `.env` file in the project root:

```
OPENAI_API_KEY=your_openai_api_key_here
```

## Deployment to Vercel

This app has two deployment options:

### Option 1: Server-side Processing (Vercel Pro)
For full server-side API key protection (recommended for production):

1. Fork or clone this repository to your GitHub account
2. Create a new project on Vercel and connect to your GitHub repository
3. Set the environment variable `OPENAI_API_KEY` in the Vercel project settings
4. For files >50MB, upgrade to Vercel Pro plan for increased function limits
5. Deploy!

### Option 2: Hybrid Processing (Free Plan Compatible)
For the Hobby/free plan with client-side fallback:

1. Fork or clone this repository to your GitHub account
2. Create a new project on Vercel and connect to your GitHub repository
3. Set the environment variable `OPENAI_API_KEY` in the Vercel project settings
4. Deploy
5. For large files that exceed Vercel's free tier limits, the app will prompt users to enter their own OpenAI API key for direct processing

### Vercel Environment Variables

| Name | Description |
|------|-------------|
| `OPENAI_API_KEY` | Your OpenAI API key (required) |

The application attempts secure server-side processing first, with an optional client-side fallback for large files.

## Usage

1. Drag and drop an audio file (M4A, MP3, WAV, OGG) onto the upload area
2. Click the "Transcribe Audio" button
3. Wait for the transcription to complete
4. View the timestamped transcription result

## Compression Features

For large audio files, the app automatically:
- Reduces sample rate (down to 6kHz for voice)
- Converts stereo to mono
- Reduces bit depth (16-bit to 8-bit)
- Applies dynamic range compression
- Uses volume scaling
- Implements advanced sample skipping for extreme cases

## Troubleshooting

If you encounter issues:
1. Ensure all dependencies are installed: `npm install`
2. Check if the API key is correctly set in environment variables
3. For API errors, check Vercel function logs
4. For file size errors, the file may still be too large even after compression