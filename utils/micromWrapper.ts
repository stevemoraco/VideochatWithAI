// utils/micromWrapper.ts
export class MicromWrapper {
  private mediaRecorder: MediaRecorder;
  private chunks: BlobPart[] = [];
  private mimeType: string;

  private isCurrentlyRecording: boolean = false;

  
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
    if (this.isCurrentlyRecording) {
      console.warn('Attempted to start recording, but it is already in progress.');
      return;
    }

    this.mediaRecorder.start();
    this.isCurrentlyRecording = true; // Set the flag to true when recording starts
    console.log('Recording started with MIME type:', this.mimeType);

    this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
      if (event.data.size > 0) {
        this.chunks.push(event.data);
      }
    };
    
  }

      public stopRecording(): Promise<Blob> {
        if (!this.isCurrentlyRecording) {
          console.warn('Attempted to stop recording, but no recording is in progress.');
          return Promise.reject(new Error('No recording is in progress.'));
        }

        return new Promise((resolve, reject) => {
          this.mediaRecorder.onstop = () => {
            console.log('Recording stopped, resolving audio blob.');
            const audioBlob = new Blob(this.chunks, { type: this.mimeType });
            this.chunks = []; // Clear the chunks for the next recording
            this.isCurrentlyRecording = false; // Reset the flag when recording stops
            resolve(audioBlob);
          };

      this.mediaRecorder.onerror = (event) => {
        console.error('Recording error:', event);
        reject(new Error('An error occurred while recording audio'));
      };

      this.mediaRecorder.stop();
    });
  }
}