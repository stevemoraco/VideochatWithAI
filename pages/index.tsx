// pages/index.tsx
import React, { useState, useEffect, useRef, useContext } from 'react';
import Webcam from 'react-webcam';
import { ChatContext } from '../context/ChatContext';
import ApiKeyForm from '../components/ApiKeyForm';
import { generateImage, generateText, generateAudio, createAssistant, gptCustomRequest } from '../utils/openAiUtils';
import styles from '../styles/Home.module.css';
import axios from 'axios';
import Cookies from 'js-cookie';
import Head from 'next/head';
import { MicromWrapper } from '../utils/micromWrapper'; // Import MicromWrapper

interface Message {
  sender: 'user' | 'system' | string; // Allow any string for character names
  text: string;
}

const IndexPage: React.FC = () => {
  const [characterName, setCharacterName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [imagePrompt, setImagePrompt] = useState('');

  const [isApiKeyEntered, setIsApiKeyEntered] = useState(false);
  const [isCharacterSelected, setIsCharacterSelected] = useState(false);
  const { characterImage, setCharacterImage } = useContext(ChatContext);
  const { setApiKeyValue, addMessage } = useContext(ChatContext);
  const [transcription, setTranscription] = useState('');
  const audioRef = useRef<HTMLAudioElement>(null);
  const webcamRef = useRef<Webcam>(null);
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [assistantId, setAssistantId] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string>('');
  const [conversationHistory, setConversationHistory] = useState<any[]>([]); // Use any[] to allow any type of objects
  const [hasInitialReplyBeenGenerated, setHasInitialReplyBeenGenerated] = useState(false);
  const [hasGeneratedResponse, setHasGeneratedResponse] = useState(false);
  const [audioEnded, setAudioEnded] = useState(false);
  const [screenshotData, setScreenshotData] = useState<string | null>(null);
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState('onyx');
  const micromRef = useRef<MicromWrapper | null>(null); // Ref for MicromWrapper
  const streamRef = useRef<MediaStream | null>(null); // Ref for the media stream
  const [isRecording, setIsRecording] = useState(false); // Add this line to track recording state
  const [countdown, setCountdown] = useState(30);

  
  const isMobileDevice = () => {
    return /Mobi|Android/i.test(navigator.userAgent);
  };


  const WebcamComponent = () => {
    const webcamRef = useRef(null);

    useEffect(() => {
      // Assuming you have a function to initialize the webcam
      const initializeWebcam = async () => {
        try {
          // Your webcam initialization logic here
          // For example, using the browser's navigator.mediaDevices.getUserMedia API
          if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (webcamRef.current) {
              //webcamRef.current.srcObject = stream;
            }
          }
        } catch (error) {
          console.error('Error initializing webcam:', error);
        }
      };

      initializeWebcam();
    }, []);

    return (
      <video ref={webcamRef} autoPlay />
    );
  };


  useEffect(() => {
    const initMediaStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        micromRef.current = new MicromWrapper(stream);
      } catch (error) {
        console.error('Error accessing user media:', error);
      }
    };

    initMediaStream();

    return () => {
      if (streamRef.current) {
        const tracks = streamRef.current.getTracks();
        tracks.forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // Refactor the useEffect hook for handling audio end event
  useEffect(() => {
    const handleAudioEnd = () => {
      console.log('Audio has ended, starting transcription.');
      setAudioEnded(true);
    };

    if (audioRef.current) {
      audioRef.current.onended = handleAudioEnd;
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.onended = null;
      }
    };
  }, []);

  // Refactor the useEffect hook for starting recording after audio ends
  useEffect(() => {
    if (audioEnded) {
      startRecording();
      setAudioEnded(false); // Reset the flag
    }
  }, [audioEnded]);

  // Refactor the useEffect hook for handling transcription
  useEffect(() => {
    if (transcription) {
      getAIResponse();
      setTranscription(''); // Reset the transcription state
    }
  }, [transcription]);

  
  // Send the transcription to the AI and get a response
  const getAIResponse = async () => {
    try {
      const aiResponse = await generateText(transcription, apiKey, assistantId || '', threadId);
      console.log(aiResponse.text);
      const base64Image = await captureScreenshot();
addMessageToConversation(characterName, aiResponse.text);// Add the AI's response to the conversation
      // Optionally, handle the AI's audio response if needed
      // For example, you might generate and play audio from the AI's text
      const audioUrl = await generateAudio(aiResponse.text, selectedVoice, apiKey);
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.load();
        audioRef.current.play();
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
      // Handle error (e.g., update UI to show an error message)
    }
  };

  
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        streamRef.current = stream; // Store the stream reference
        micromRef.current = new MicromWrapper(stream);
      })
      .catch(error => console.error('Error accessing user media:', error));
  }, []);

  const transcribeAudio = async (audioBlob: Blob) => {
    // Create a FileReader to read the audio blob
    const reader = new FileReader();

    // Define what happens when the reading operation is completed
    reader.onloadend = async () => {
      try {
        // Convert the audio blob to a base64-encoded string
        const base64Audio = reader.result as string;

        // Determine the audio format based on the MIME type of the blob
        let audioFormat;
        if (audioBlob.type === 'audio/webm') {
          audioFormat = 'webm';
        } else if (audioBlob.type === 'audio/x-m4a' || audioBlob.type === 'audio/mp4') {
          audioFormat = 'm4a';
        } else {
          console.log('Audio type not matched', audioBlob.type);
          // Add any additional audio formats you wish to support
          audioFormat = 'mp3'; // Default to mp3 if the format is not recognized
        }

        // Send the base64 audio and format to the ser  ver for transcription
        const response = await axios.post('/api/transcribe', {
          audio: base64Audio,
          format: audioFormat,
        });

        // Extract the transcription text from the server response
        console.log('Transcript:', response.data.text);
        const transcript = response.data.text;
        setTranscription(transcript);
addMessageToConversation('user', transcript); // Add the transcribed message to the conversation
        console.log('Transcription state updated:', transcript);
      } catch (error: any) {
        console.error('Error sending audio for transcription:', error);
        // Handle any errors that occurred during the POST request
        if (axios.isAxiosError(error) && error.response) {
          // The server responded with a status code outside the 2xx range
          console.error('Error response data:', error.response.data);
        } else {
          // Something else happened while setting up the request
          console.error('Error message:', error.message);
        }
        // Optionally, update the UI to show an error message
        //setError('Failed to transcribe audio. Please try again.');
      }
    };

    // Define what happens in case of an error during the reading operation
    reader.onerror = (error) => {
      console.error('Error reading audio blob:', error);
      // Optionally, update the UI to show an error message
      //setError('Failed to read audio blob. Please try again.');
    };

    // Start reading the audio blob as a base64-encoded string
    reader.readAsDataURL(audioBlob);
  };


  const startRecording = () => {
    if (!isRecording && micromRef.current) {
      console.log('Starting recording...');
      setIsRecording(true);
      setCountdown(30); // Reset countdown to 30 seconds
      micromRef.current.startRecording();
      // Start the countdown timer
      recordingTimeoutRef.current = setTimeout(() => {
        stopRecording();
      }, 30000); // Stop recording after 30 seconds
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRecording && countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prevCountdown) => prevCountdown - 1);
      }, 1000);
    } else if (countdown === 0) {
      stopRecording();
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRecording, countdown]);


  const stopRecording = async () => {
    console.log('stopRecording called, isRecording:', isRecording);
    if (isRecording && micromRef.current) {
      const audioBlob = await micromRef.current.stopRecording();
      setIsRecording(false);
      console.log('Recording stopped.');
      transcribeAudio(audioBlob);
      setCountdown(30); // Reset countdown
    }
  };

/*
  // Move this useEffect to the top level of your component
  useEffect(() => {
    if (transcription) {
      console.log('calling for new reply from the AI with', transcription);

      getAIResponse();
    }
  }, [transcription, apiKey, assistantId, selectedVoice]);
  */

  // Cleanup function to stop recording and release media stream
  useEffect(() => {
    return () => {
      if (micromRef.current) {
        micromRef.current.stopRecording().catch(console.error);
      }
      // Also stop the media stream tracks if they are still running
      if (streamRef.current) {
        const tracks = streamRef.current.getTracks();
        tracks.forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

// Function to handle audio play
  const handleAudioPlay = async () => {
    if (audioRef.current) {
      try {
        await audioRef.current.play();
        console.log('Audio is playing');
        setIsAudioReady(false); // Hide the play button after audio starts playing
      } catch (e) {
        console.error(`Error playing TTS audio: ${e}`);
      }
    }
  };

  const captureScreenshot = (): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (webcamRef.current) {
        const screenshot = webcamRef.current.getScreenshot();
        if (screenshot) {
          setScreenshotData(screenshot); // Save the screenshot data in state
          resolve(screenshot); // Resolve the promise with the base64-encoded string
        } else {
          reject(new Error('Failed to capture screenshot.'));
        }
      } else {
        //reject(new Error('Webcam reference is not available.'));
      }
    });
  };

  // Function to handle stopping the recording early
  const handleStopEarly = () => {
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null; // Reset the timeout ref
    }
    if (isRecording) {
      stopRecording();
    }
    setCountdown(30); // Reset countdown
  };

  // Function to add messages to the conversation history and log them
  const addMessageToConversation = (sender: 'user' | 'system' | string, text: string) => {
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
    Cookies.set('apiKey', enteredApiKey);
    addMessageToConversation('system', `API Key received and saved to cookies`);
  };

  // Function to handle character selection
  const handleCharacterSelection = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const base64Image = captureScreenshot();
    const voice = await gptCustomRequest('gpt-4-1106-preview', 0, 'Pick the most appropriate voice for the character based on the descriptions, and reply with just the voice name', `Select one of these voices for ${characterName}. It must be the closest voice to what real life would sound like.\n\nHere is the list of available voices:\n
    alloy - matter of fact, feminine
    \necho — melodic, ambiguous
    \nfable — british, bright, feminine
    \nonyx — deep, thoughtful, masculine
    \nnova — bright, mousy, feminine, silly and fun!
    \nshimmer — enthusiastic, feminine
    \nReply with just the name of the most appropriate voice for ${characterName} now.`, 10, apiKey);
    const voiceName = voice.trim().toLowerCase().split(' ')[0];
      setSelectedVoice(voice);
    addMessageToConversation('system', `${characterName}'s closest openAI voice match is ${voice}`);

     addMessageToConversation('system', `${characterName} is installing a Zoom software update and will be 1-2 minutes late to the call...`);


    
   const dynamicImage = await gptCustomRequest('gpt-4-vision-preview', 0, `You are a detailed DALL-E 3 Image Prompt Creator. When given a name for a character, you always reply with a prompt for a zoom webcam view of a character. Describe a scene they might be taking a zoom call from, if they are a famous or well known character describe elements all around them that will be recognizeable as theirs. Be very detailed in describing the composition, where they are in frame, how they are sitting, what objects are nearby, and more. Always begin the image prompt with 'This is the view from a laptop webcam" and then go on to describe the rest of the scene in detail. Include lots of interesting little details people who know the character's story very well would be surprised and delighted to see, but don't use many adjectives just name the objects. End your scene description by describing their appearance directly. What are they wearing? What is their facial expression? The last sentence should describe their reaction or facial expression. Do not use any words that evoke sexuality or anything risque, instead keep it very professional. Never use the character's name, just describe what they look like. Make sure towards the end to specify that the field of view should be like an environmental portrait. The character should be close to the camera. Be as brief as possible while including the details discussed here. Be mindful not to come anywhere close to violating OpenAI's image content policy. Be very conservative in your word choice. Do not mention any brand names or names of people, historical or fictional, only describe them in visual terms. Reply with only the image prompt.`, `Describe what it would look like if ${characterName} were to take a zoom call in the same context as the user. First, describe the user's webcam view, then, come up with the best possible image prompt for what a zoom call with ${characterName} would look like if they were in the same situation as the user. \n\nAlways begin the image prompt with 'This is the view from ${characterName}'s laptop webcam" and then go on to describe the rest of the scene in detail. Include lots of interesting little details people who know the character's story very well would be surprised and delighted to see, but don't use many adjectives just name the objects. End your scene description by describing ${characterName}'s appearance directly. What are they wearing? What is their facial expression? The last sentence should describe their reaction or facial expression. Do not use any words that evoke sexuality or anything risque, instead keep it very professional. Never use the character's name, just describe what they look like. Make sure towards the end to specify that the field of view should be pretty zoomed in, an environmental portrait. The character should be close to the camera. Be mindful not to come anywhere close to violating OpenAI's image content policy. Be very conservative in your word choice. Do not mention any brand names or names of people, historical or fictional, only describe them in visual terms. Be as brief as possible while including the details discussed here. Please make the prompt reflect the exact same kind of scene as the image we've provided of the user. If the character is not human, be sure to say that explicitly and describe the kind of creature they are and what they look like. Reply with only the image prompt.`, 250, apiKey);

    // const dynamicImage = await gptCustomRequest('gpt-4-vision-preview', 0, `Describe this image.`, `Describe this image.`, 250, apiKey, base64Image);
    addMessageToConversation('system', `${characterName} is logging on. ${dynamicImage}`);
    setImagePrompt(dynamicImage);
    if (characterName && apiKey) {
      try {
        const imageUrlPromise = generateImage(dynamicImage, apiKey);
        const assistantIdPromise = createAssistant(apiKey, `You are ${characterName}, but on a zoom call. Your surroundings look like this: ${dynamicImage}\n\nPlease greet me like people usually do on zoom: "can you see my camera okay?" or "Can you hear me?" or "Hey sorry I'm 2 minutes late, quick restroom break between meetings" or "What's on our agenda for this meeting?" but do so in a way that is recognizable as your character, and then ask me a question getting to know me. This is our first time meeting. Make sure to stay in character during our whole conversation, and phrase things in a way that is obviously you.`, characterName);

        const [imageUrl, assistantRealId] = await Promise.all([imageUrlPromise, assistantIdPromise]);

        console.log('image & assistant id', imageUrl, assistantRealId);
        setCharacterImage(imageUrl);
        setIsCharacterSelected(true);

        setAssistantId(assistantRealId);

        const initialReplyPromise = generateText(`You are ${characterName}. Please greet me in a way that is recognizable as you, and then ask me a question getting to know me. This is our first time meeting. Make sure to stay in character during our whole conversation`, apiKey, assistantRealId);
        const initialReply = await initialReplyPromise;
        console.log('Initial reply:', initialReply);
        setThreadId(initialReply.newThreadId || '');
        addMessageToConversation(characterName, initialReply.text);

        const audioUrlPromise = generateAudio(initialReply.text, voiceName, apiKey);
        const audioUrl = await audioUrlPromise;

        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          audioRef.current.load();
          if (!isMobileDevice()) {
            audioRef.current.play().catch((e) => {
              addMessageToConversation('system', `Error playing TTS audio: ${e}`);
            });
          } else {
            // On mobile devices, set a flag that indicates audio is ready to be played
            setIsAudioReady(true);
          }
        }
      } catch (error) {
          console.error('Error sending audio for transcription:', error);
          // Handle any errors that occurred during the POST request
          if (axios.isAxiosError(error) && error.response) {
            // The server responded with a status code outside the 2xx range
            console.error('Error response data:', error.response.data);
            // Log the detailed error message
              if (axios.isAxiosError(error) && error.response) {
              console.error('Error response data:', error.response.data);
              if ((error.response.data as any).error?.message) {
                console.error('Detailed error message:', (error.response.data as any).error.message);
                addMessageToConversation('system', `Error in character selection: ${(error.response.data as any).error.message}`);
              }
            }
          } else {
            // Something else happened while setting up the request
          //  console.error('Error message:', error.message as any).error.message);
          }
          // Optionally, update the UI to show an error message
          //setError('Failed to transcribe audio. Please try again.');
        }     
    }
  };

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        streamRef.current = stream; // Store the stream reference
        if (!micromRef.current) {
          micromRef.current = new MicromWrapper(stream);
        }
      })
      .catch(error => console.error('Error accessing user media:', error));
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.onended = () => {
        console.log('Audio has ended, starting transcription.');
        setAudioEnded(true);
      };
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.onended = null;
      }
    };
  }, [audioRef]);

  useEffect(() => {
    if (audioEnded && !isRecording) {
      startRecording();
      setAudioEnded(false); // Reset the flag
    }
  }, [audioEnded, isRecording]);

  // Function to clear the API key
  const handleClearApiKey = () => {
    setApiKey('');
    setIsApiKeyEntered(false);
    Cookies.remove('apiKey');
    addMessageToConversation('system', `API Key has been cleared`);
    
  };



  return (
    <div className={styles.container}>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <title>Chat with AI Characters | FacetimeAnyone.com</title>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/header.jpg" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@SteveMoraco" />
        <meta name="twitter:title" content="Chat with AI Characters | FacetimeAnyone.com" />
        <meta name="twitter:description" content="Experience interactive conversations with AI characters. Capture moments and transcribe audio in real-time on FacetimeAnyone.com." />
        <meta name="twitter:image" content="https://facetimeanyone.com/header.jpg" />
        <meta itemProp="name" content="Chat with AI Characters | FacetimeAnyone.com" />
        <meta itemProp="description" content="Experience interactive conversations with AI characters. Capture moments and transcribe audio in real-time on FacetimeAnyone.com." />
        <meta itemProp="image" content="/header.jpg" />
      </Head>

      <div className={styles.container}>
        {!isApiKeyEntered && <ApiKeyForm onSubmit={handleApiKeySubmit} />}
        {isApiKeyEntered && !isCharacterSelected && (
      <>

        <button onClick={handleClearApiKey}>Clear API Key</button>
          <form onSubmit={handleCharacterSelection}>

            <label htmlFor="character-name"><br/>This platform works best on desktop using the Chrome browser right now. Who would you like to chat with?</label>
            <input
              id="character-name"
              type="text"
              value={characterName}
              onChange={(e) => setCharacterName(e.target.value)}
              placeholder="Enter character name"
            />
            <button type="submit">Start Chat</button>
          </form>
      </>
        )}
      
        {isCharacterSelected && (
          <div className={styles.chatContainer}>
            <div className={styles.aspectRatioContainer}>
              <div className={styles.characterImage}>
                {characterImage && (
                  <img src={characterImage} alt="AI Character" className={styles.aspectRatioContent} />
                )}
              </div>
            </div>
            <div className={styles.aspectRatioContainer}>
              <div className={styles.webcamFeed}>
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    aspectRatio: 16 / 9
                  }}
                  className={styles.aspectRatioContent}
                />
              </div>
            </div>
          </div>
        )}
        <audio ref={audioRef} style={{ visibility: 'hidden' }} />
        {isRecording && (
          <button onClick={handleStopEarly}>
            {countdown > 0 ? `Stop Recording Early (${countdown}s)` : 'Stop Recording'}
          </button>
        )}

        {isAudioReady && isMobileDevice() && (
          <button onClick={handleAudioPlay}>Play Character&apos;s Message</button>
        )}
        <div>
          <label htmlFor="voice-selection">Choose a voice:</label>
          <select
            id="voice-selection"
            value={selectedVoice}
            onChange={(e) => setSelectedVoice(e.target.value)}
          >
            <option value="alloy">Alloy — matter of fact, feminine</option>
            <option value="echo">Echo — melodic, ambiguous</option>
            <option value="fable">Fable  — british, bright, feminine</option>
            <option value="onyx">Onyx — deep, thoughtful, masculine</option>
            <option value="nova">Nova — bright, mousy, feminine</option>
            <option value="shimmer">Shimmer — enthusiastic, feminine</option>
          </select>
        </div>
        <div>
          {conversationHistory.map((message, index) => (
            <p key={index}>
              <strong>{message.sender === 'user' ? 'You' : message.sender === 'ai' ? 'AI' : characterName}:</strong> {message.text}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
};

export default IndexPage;