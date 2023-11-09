// utils/micromWrapper.ts
export class MicromWrapper {
  private mediaRecorder: MediaRecorder;
  private chunks: BlobPart[] = [];
  private mimeType: string;

  constructor(stream: MediaStream) {
    // Determine the MIME type based on browser support
    if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      this.mimeType = 'audio/webm;codecs=opus';
    } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
      this.mimeType = 'audio/mp4';
    } else {
      throw new Error('Unsupported MIME type for recording');
    }

    this.mediaRecorder = new MediaRecorder(stream, { mimeType: this.mimeType });
  }

  public startRecording(): void {
    this.mediaRecorder.start();
    this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
      if (event.data.size > 0) {
        this.chunks.push(event.data);
      }
    };
  }

  public stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.chunks, { type: this.mimeType });
        this.chunks = []; // Clear the chunks for the next recording
        resolve(audioBlob);
      };

      this.mediaRecorder.onerror = () => {
        reject(new Error('An error occurred while recording audio'));
      };



      this.mediaRecorder.stop();
    });
  }
}