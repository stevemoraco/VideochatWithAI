  // pages/index.tsx
  import React, { useState, useEffect, useRef, useContext } from 'react';
  import Webcam from 'react-webcam';
  import { ChatContext } from '../context/ChatContext';
  import ApiKeyForm from '../components/ApiKeyForm';
  import { generateImage, generateText, generateAudio, createAssistant } from '../utils/openAiUtils';
  import styles from '../styles/Home.module.css';
  import { useRecorder } from '../hooks/useRecorder';
  import axios from 'axios';
import Cookies from 'js-cookie';
import Head from 'next/head';


  interface Message {
    sender: 'user' | 'ai' | 'system';
    text: string;
  }

  const IndexPage: React.FC = () => {
    const [characterName, setCharacterName] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [isApiKeyEntered, setIsApiKeyEntered] = useState(false);
    const [isCharacterSelected, setIsCharacterSelected] = useState(false);
    const { characterImage, setCharacterImage } = useContext(ChatContext);
    const { setApiKeyValue, addMessage } = useContext(ChatContext);
    const { audioData, isRecording, startRecording, stopRecording } = useRecorder();
    const [transcription, setTranscription] = useState('');
    const audioRef = useRef<HTMLAudioElement>(null);
    const webcamRef = useRef<Webcam>(null);
    const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [assistantId, setAssistantId] = useState<string | null>(null);
    const [threadId, setThreadId] = useState<string | null>(null);
    const [conversationHistory, setConversationHistory] = useState<Message[]>([]);
    const [hasInitialReplyBeenGenerated, setHasInitialReplyBeenGenerated] = useState(false);
    const [hasGeneratedResponse, setHasGeneratedResponse] = useState(false);
    const [audioEnded, setAudioEnded] = useState(false);
    const [screenshotData, setScreenshotData] = useState<string | null>(null);

    // Function to capture a screenshot from the webcam
    const captureScreenshot = () => {
      if (webcamRef.current) {
        const screenshot = webcamRef.current.getScreenshot();
        setScreenshotData(screenshot); // Save the screenshot data in state
      }
    };

    // Function to handle stopping the recording early
    const handleStopEarly = () => {
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
        recordingTimeoutRef.current = null; // Reset the timeout ref
      }
      if (isRecording) {
        stopRecording();
        captureScreenshot(); // Capture the screenshot when recording stops
        //addMessageToConversation('system', 'Recording stopped early by user.');
      }
    };

    
    // Function to add messages to the conversation history and log them
    const addMessageToConversation = (sender: 'user' | 'ai' | 'system', text: string) => {
      const newMessage: Message = { sender, text };
      setConversationHistory(prevHistory => [...prevHistory, newMessage]);
      console.log(`[${sender.toUpperCase()}]: ${text}`);
    };


    useEffect(() => {
      const savedApiKey = Cookies.get('apiKey');
      if (savedApiKey) {
        setApiKey(savedApiKey);
        setIsApiKeyEntered(true);
      }
    }, []);

    // Function to handle API key submission
    const handleApiKeySubmit = (enteredApiKey: string) => {
      setApiKey(enteredApiKey);
      setIsApiKeyEntered(true);
      Cookies.set('apiKey', enteredApiKey)
      addMessageToConversation('system', `API Key received and saved to cookies`);
    };

    // Function to handle character selection
    const handleCharacterSelection = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      addMessageToConversation('system', ` ${characterName} is installing a Zoom software update and will be 1-2 minutes late to the call...`);
      if (characterName && apiKey) {
        try {
          const imageUrlPromise = generateImage(characterName, apiKey);
          const assistantIdPromise = createAssistant(apiKey, `You are ${characterName}. Please greet me in a way that is recognizable as you, and then ask me a question getting to know me. This is our first time meeting. Make sure to stay in character during our whole conversation`, characterName);

          const [imageUrl, assistantRealId] = await Promise.all([imageUrlPromise, assistantIdPromise]);

          console.log('image & assistant id', imageUrl, assistantRealId);
          setCharacterImage(imageUrl);
          setIsCharacterSelected(true);
          //addMessageToConversation('system', `Character image URL: ${imageUrl}`);

          setAssistantId(assistantRealId);
          //addMessageToConversation('system', `Assistant ID: ${assistantRealId}`);

          const initialReplyPromise = generateText(`You are ${characterName}. Please greet me in a way that is recognizable as you, and then ask me a question getting to know me. This is our first time meeting. Make sure to stay in character during our whole conversation`, apiKey, assistantRealId);
          const initialReply = await initialReplyPromise;
          console.log('Initial reply:', initialReply);
          setThreadId(initialReply.newThreadId);
          addMessageToConversation('ai', initialReply.text);

          const audioUrlPromise = generateAudio(initialReply.text, 'onyx', apiKey);
          const audioUrl = await audioUrlPromise;
          //addMessageToConversation('system', `Audio URL: ${audioUrl}`);

          if (audioRef.current) {
            audioRef.current.src = audioUrl;
            audioRef.current.load();
            audioRef.current.play().then(() => {
              //addMessageToConversation('system', 'Audio is playing');
            }).catch((e) => {
              addMessageToConversation('system', `Error playing TTS audio: ${e}`);
            });
          }
        } catch (error) {
          addMessageToConversation('system', `Error in character selection: ${error}`);
        }
      }
    };


    useEffect(() => {
      if (audioRef.current) {
        audioRef.current.onended = () => {
          //addMessageToConversation('system', 'Character message ended, starting user audio recording.');
          startRecording();
          recordingTimeoutRef.current = setTimeout(() => {
            stopRecording();
          }, 30000); // Adjust the timeout as needed
        };
      }

      // Cleanup function to remove the event listener
      return () => {
        if (audioRef.current) {
          audioRef.current.onended = null;
        }
        if (recordingTimeoutRef.current) {
          clearTimeout(recordingTimeoutRef.current);
        }
      };
    }, [startRecording, stopRecording]);

    useEffect(() => {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true })
          .then((stream) => {
            if (webcamRef.current && webcamRef.current.video) {
              webcamRef.current.video.srcObject = stream;
              //addMessageToConversation('system', 'Webcam stream started.');
            }
          })
          .catch((error) => {
            addMessageToConversation('system', `Error accessing webcam: ${error}`);
          });
      }
    }, []);

    // Add a new state to track when to process the audio
    const [shouldProcessAudio, setShouldProcessAudio] = useState(false);

    useEffect(() => {
      if (shouldProcessAudio) {
        const transcribeAndGenerateResponse = async () => {
          if (!isRecording && audioData && !hasGeneratedResponse) {
            //addMessageToConversation('system', 'Audio recording stopped, sending for transcription.');
            const reader = new FileReader();
            reader.onloadend = async () => {
              const base64Audio = reader.result as string;
              try {
                const transcriptionResponse = await axios.post('/api/transcribe', {
                  audio: base64Audio,
                  format: 'webm',
                  apiKey: apiKey,
                });

                const transcript = transcriptionResponse.data.text;
                setTranscription(transcript);
                addMessageToConversation('user', transcript);

                if (assistantId && transcript) {
                  //addMessageToConversation('system', 'Generating AI response based on transcript...');
                  const response = await generateText(transcript, apiKey, assistantId, threadId as null | undefined);
                  const nextReplyText = response.text;
                  setThreadId(response.newThreadId);
                  addMessageToConversation('ai', nextReplyText);

                  if (nextReplyText && nextReplyText !== transcript) {
                    const nextAudioUrl = await generateAudio(nextReplyText, 'onyx', apiKey);
                    //addMessageToConversation('system', `Next audio URL: ${nextAudioUrl}`);
                    if (audioRef.current) {
                      audioRef.current.src = nextAudioUrl;
                      audioRef.current.play().then(() => {
                        setHasGeneratedResponse(true);
                      }).catch((e) => addMessageToConversation('system', `Error playing TTS audio: ${e}`));
                    }
                  } else {
                    addMessageToConversation('system', 'Received repeated response from AI.');
                    setHasGeneratedResponse(true);
                  }
                } else {
                  addMessageToConversation('system', 'Assistant ID is not set or transcript is empty.');
                  setHasGeneratedResponse(true);
                }
              } catch (error) {
                addMessageToConversation('system', `Error sending audio for transcription or generating next reply: ${error}`);
                setHasGeneratedResponse(true);
              }
            };
            reader.readAsDataURL(audioData);
          }
        };

        transcribeAndGenerateResponse();
        setShouldProcessAudio(false); // Reset the flag after processing
      }
    }, [shouldProcessAudio, isRecording, audioData, apiKey, assistantId, threadId, hasGeneratedResponse, addMessageToConversation]);


    useEffect(() => {
      if (audioRef.current) {
        audioRef.current.onended = () => {
          console.log('Audio ended, setting flags for next actions');
          setHasGeneratedResponse(false); // Allow the next response to be generated
          setAudioEnded(true); // Indicate that the audio has ended to trigger recording
        };
      }

      // Cleanup function to remove the event listener
      return () => {
        if (audioRef.current) {
          audioRef.current.onended = null;
        }
      };
    }, [audioRef]);

    useEffect(() => {
      if (audioEnded) {
        console.log('Audio has ended, starting new recording');
        startRecording();
        setAudioEnded(false); // Reset the flag
      }
    }, [audioEnded, startRecording]);

    // This useEffect triggers when recording stops and there is audio data.
    useEffect(() => {
      console.log('Recording stopped, checking if should process audio:', !isRecording, audioData);
      if (!isRecording && audioData) {
        console.log('Setting shouldProcessAudio to true');
        setShouldProcessAudio(true);
      }
    }, [isRecording, audioData]);

    // This useEffect handles the transcription and AI response generation.
    useEffect(() => {
      const transcribeAndGenerateResponse = async () => {
        if (shouldProcessAudio && !hasGeneratedResponse) {
          console.log('Processing audio for transcription and AI response');
          // ... rest of the transcription and AI response logic
          setShouldProcessAudio(false); // Reset the flag after processing
        }
      };

      transcribeAndGenerateResponse();
    }, [shouldProcessAudio, hasGeneratedResponse, /* other dependencies */]);
    


    // useEffect hook to send the message to the AI after transcription
    useEffect(() => {
      const sendMessageToAI = async () => {
        if (transcription && screenshotData && characterImage) {
          // Prepare the payload with the transcribed text and images
          const payload = {
            model: "gpt-4-vision-preview",
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: transcription },
                  { type: "image_url", image_url: { url: characterImage } },
                  { type: "image_url", image_url: { url: `data:image/jpeg;base64,${screenshotData}` } }
                ]
              }
            ],
            max_tokens: 300
          };

          // Send the payload to the AI
          // ... (code to send the payload to the AI)
        }
      };

      sendMessageToAI();
    }, [transcription, screenshotData, characterImage]);
    

    return (
      <div>
        <Head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />

          <title>Chat with AI Characters | FacetimeAnyone.com</title>
          <link rel="icon" href="/favicon.ico" />
          <link rel="apple-touch-icon" href="/header.jpg" />

          {/* Twitter Card data */}
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:site" content="@SteveMoraco" />
          <meta name="twitter:title" content="Chat with AI Characters | FacetimeAnyone.com" />
          <meta
            name="twitter:description"
            content="Experience interactive conversations with AI characters. Capture moments and transcribe audio in real-time on FacetimeAnyone.com."
          />
          <meta name="twitter:image" content="/header.jpg" />

          {/* Google / Schema.org */}
          <meta itemProp="name" content="Chat with AI Characters | FacetimeAnyone.com" />
          <meta itemProp="description" content="Experience interactive conversations with AI characters. Capture moments and transcribe audio in real-time on FacetimeAnyone.com." />
          <meta itemProp="image" content="/header.jpg" />
        </Head>
        {!isApiKeyEntered && <ApiKeyForm onSubmit={handleApiKeySubmit} />}
        {isApiKeyEntered && !isCharacterSelected && (
          <form onSubmit={handleCharacterSelection}>
            <label htmlFor="character-name">Who would you like to chat with?</label>
            <input
              id="character-name"
              type="text"
              value={characterName}
              onChange={(e) => setCharacterName(e.target.value)}
              placeholder="Enter character name"
            />
            <button type="submit">Start Chat</button>
          </form>
        )}
        {isCharacterSelected && (
          <div className={styles.chatContainer}>
            <div className={styles.characterImage}>
              {characterImage && <img src={characterImage} alt="AI Character" />}
            </div>
            <div className={styles.webcamFeed}>
              <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" />
            </div>
          </div>
        )}
        <audio ref={audioRef} style={{ visibility: 'hidden' }} />
        {isRecording && (
          <button onClick={handleStopEarly}>Stop Recording Early</button>
        )}
        <div>
          {conversationHistory.map((message, index) => (
            <p key={index}>
              <strong>{message.sender === 'user' ? 'You' : message.sender === 'ai' ? 'AI' : 'System'}:</strong> {message.text}
            </p>
          ))}
        </div>
      </div>
    );
  };

  export default IndexPage;