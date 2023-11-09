import React, { useState, useRef } from 'react';
import axios from 'axios';
import { generateAudio } from '../utils/openAiUtils';

const AudioPage: React.FC = () => {
  const [text, setText] = useState('');
  const [apiKey, setApiKey] = useState('');
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
  };

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiKey(e.target.value);
  };
  const handlePlayAudio = async () => {
    if (text && apiKey) {
      try {
        const audioUrl = await generateAudio(text, apiKey);
        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          audioRef.current.play().catch((e) => console.error('Error playing TTS audio:', e));
        }
      } catch (error) {
        console.error('Error generating TTS audio:', error);
      }
    } else {
      alert('Please enter both text and API key.');
    }
  };

  const generateAudio = async (text: string, apiKey: string): Promise<string> => {
    const headers = {
      'Authorization': `Bearer ${apiKey}`,
    };

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/audio/speech',
        {
          model: "tts-1",
          voice: 'onyx',
          input: text,
        },{
        headers: headers,
        responseType: 'blob' // Set the response type to 'blob' to handle binary data
      });

      // Create a blob URL for the audio file
      const audioBlob = new Blob([response.data], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      return audioUrl;
    } catch (error: any) {
      console.error('Error generating audio:', error);
      throw error;
    }
  };

  return (
    <div>
      <input
        type="text"
        value={text}
        onChange={handleTextChange}
        placeholder="Enter text to synthesize"
      />
      <input
        type="password"
        value={apiKey}
        onChange={handleApiKeyChange}
        placeholder="Enter OpenAI API Key"
      />
      <button onClick={handlePlayAudio}>Play Audio</button>
      <audio ref={audioRef} controls />
    </div>
  );
};

export default AudioPage;