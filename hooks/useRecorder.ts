import { useState, useCallback } from 'react';

export const useRecorder = () => {
  const [mediaBlobUrl, setMediaBlobUrl] = useState<string | null>(null);
  const [audioData, setAudioData] = useState<Blob | null>(null); // Add this line
  const [isRecording, setIsRecording] = useState<boolean>(false);
  let mediaRecorder: MediaRecorder | null = null;

  const startRecording = useCallback(() => {
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      mediaRecorder = new MediaRecorder(stream);
      let chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setMediaBlobUrl(URL.createObjectURL(blob));
        setAudioData(blob); // Set the audio data state
        chunks = [];
      };

      mediaRecorder.start();
      setIsRecording(true);
    });
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  }, [mediaRecorder]);

  return {
    mediaBlobUrl,
    audioData, // Include audioData in the returned object
    isRecording,
    startRecording,
    stopRecording,
  };
};