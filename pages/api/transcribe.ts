import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import FormData from 'form-data';
import { Readable } from 'stream';

function bufferToStream(buffer: any) {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);  // Indicates EOF
  return stream;
}

export default async (req: NextApiRequest, res: NextApiResponse) => {
  let { audio: base64Audio, format } = req.body;

  console.log('input', format);
  if(format === 'm4a') {
    format = 'mp3';
  }
  console.log('input', format);


  // Convert base64 to buffer
  const buffer = Buffer.from(base64Audio.split(',')[1], 'base64');
  
  // Convert buffer to stream
  const stream = bufferToStream(buffer);

  // Create a new FormData object
  const formData = new FormData();
  formData.append('file', stream, { filename: `audio.${format}`, contentType: `audio/${format}` });
  formData.append('model', 'whisper-1');

  try {
    const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
    });
    console.log('Response:', response.data)
    res.status(200).json(response.data);
  } catch (error: any) {
    console.error(error.response.data.error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};