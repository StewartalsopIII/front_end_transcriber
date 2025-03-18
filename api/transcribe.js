// api/transcribe.js
import axios from 'axios';
import formidable from 'formidable';
import { Buffer } from 'buffer';
import { createReadStream } from 'fs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = new formidable.IncomingForm();
    form.parse(req, async (err, fields, files) => {
      if (err) {
        return res.status(500).json({ error: 'Error parsing form data' });
      }

      const audioFile = files.file;
      if (!audioFile) {
        return res.status(400).json({ error: 'No audio file provided' });
      }

      // Get the API key from environment variables on the server
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'API key not configured' });
      }

      try {
        const response = await axios.post(
          'https://api.openai.com/v1/audio/transcriptions',
          {
            file: createReadStream(audioFile.filepath),
            model: 'whisper-1',
            response_format: 'verbose_json',
            timestamp_granularities: ['segment']
          },
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'multipart/form-data'
            },
            maxBodyLength: Infinity
          }
        );

        return res.status(200).json(response.data);
      } catch (error) {
        console.error('OpenAI API error:', error.response?.data || error.message);
        return res.status(error.response?.status || 500).json({
          error: 'Error from OpenAI API',
          details: error.response?.data || error.message
        });
      }
    });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};