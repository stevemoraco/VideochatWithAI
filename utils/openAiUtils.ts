// utils/openAiUtils.ts

import axios, { AxiosError, AxiosResponse } from 'axios';

interface RunData {
  id: string;
  status: string;
  // Include other properties of the run data if needed
}

// Define the expected structure of the API responses
interface OpenAIResponse<T> {
  data: T;
}

interface AssistantData {
  id: string;
  // Include other properties of the assistant data if needed
}

interface ThreadData {
  id: string;
  // Include other properties of the thread data if needed
}

interface MessageData {
  content: { text: string }[];
  role: string; // Add this line to include the role property
  // Include other properties of the message data if needed
  created_at?: number; // Assuming 'created_at' is a timestamp, make it optional if it's not always present
}

interface ImageData {
  url: string;
  // Include other properties of the image data if needed
}

interface AudioData {
  url: string;
  // Include other properties of the audio data if needed
}

// Now, let's use these interfaces in the Axios calls

export const createAssistant = async (apiKey: string, instructions: string, name: string): Promise<string> => {
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'OpenAI-Beta': 'assistants=v1'
  };

  try {
    const assistantResponse = await axios.post<OpenAIResponse<AssistantData>>(
      'https://api.openai.com/v1/assistants',
      {
        name: `Zoom Room With ${name}`,
        instructions: instructions,
        model: "gpt-4-1106-preview",
      },
      { headers }
    );
    // Correctly access the id property from the nested data object
    console.log('assistantResponse', assistantResponse.data.data.id);
    const assistantId = assistantResponse.data.data.id;
    return assistantId;
  } catch (error: any) {
    const axiosError = error as AxiosError;
    console.error('Error creating assistant:', axiosError.response?.data || axiosError.message);
    throw axiosError;
  }
};


export const generateText = async (
  prompt: string,
  apiKey: string,
  assistantId: string,
  threadId?: string | null, // Allow null as well
  retryCount: number = 3 // Default to 3 retries
): Promise<{ text: string; newThreadId: string }> => {
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'OpenAI-Beta': 'assistants=v1'
  };

  try {
    console.log('Starting generateText function');

    // Create a Thread only if threadId is not provided
    if (!threadId) {
      console.log('Creating a new thread');
      const threadResponse = await axios.post<OpenAIResponse<ThreadData>>(
        'https://api.openai.com/v1/threads',
        {},
        { headers }
      );
      // Correctly access the id property from the nested data object
      threadId = threadResponse.data.data.id;
      console.log(`New thread created with ID: ${threadId}`);
    } else {
      console.log(`Using existing thread with ID: ${threadId}`);
    }

    // Add a Message to the existing Thread
    console.log('Adding user message to the thread');
    await axios.post<OpenAIResponse<MessageData>>(
      `https://api.openai.com/v1/threads/${threadId}/messages`,
      {
        role: "user",
        content: prompt
      },
      { headers }
    );
    console.log('User message added to the thread');

    let runResponse;
    let runStatus;
    let retryAttempts = 0;

    do {
      // Run the Assistant
      console.log('Running the assistant');
      // Then use this interface in the Axios call
      runResponse = await axios.post<OpenAIResponse<RunData>>(
        `https://api.openai.com/v1/threads/${threadId}/runs`,
        {
          assistant_id: assistantId,
        },
        { headers }
      );
      console.log(`Assistant run started with ID: ${runResponse.data.data.id}`);


      // Poll the run status until it's completed or failed
      runStatus = runResponse.data.data.status;
      while (runStatus !== 'completed' && runStatus !== 'failed') {
        console.log(`Polling for run status: ${runStatus}`);
        const statusResponse = await axios.get<OpenAIResponse<any>>(
          `https://api.openai.com/v1/threads/${threadId}/runs/${runResponse.data.data.id}`,
          { headers }
        );
        // Assuming statusResponse.data has a structure like { data: { status: string } }
        runStatus = statusResponse.data.data.status;
        // Implement a delay between polls if necessary
        await new Promise(resolve => setTimeout(resolve, 1000)); // Delay of 1 second
      }

      if (runStatus === 'failed') {
        console.log(`Run failed, retry attempt: ${retryAttempts + 1}`);
        retryAttempts++;
      }
    } while (runStatus === 'failed' && retryAttempts < retryCount);

    if (runStatus === 'failed') {
      throw new Error('Assistant run failed after retry attempts');
    }

    console.log('Assistant run completed');

    // Retrieve the messages added by the Assistant to the Thread
    console.log('Retrieving messages from the thread');
    const messagesResponse = await axios.get<OpenAIResponse<MessageData[]>>(
      `https://api.openai.com/v1/threads/${threadId}/messages`,
      { headers }
    );

    // Filter for assistant messages and sort by creation time to get the latest
    // Filter for assistant messages and sort by creation time to get the latest
    const assistantMessages = messagesResponse.data.data
      .filter((message) => message.role === 'assistant')
      .sort((a, b) => (b.created_at || 0) - (a.created_at || 0)); // Assuming 'created_at' is a timestamp

    // Get the latest assistant message
    const latestAssistantMessage = assistantMessages[0];

    let returnStatement = '';
    if (latestAssistantMessage && latestAssistantMessage.content) {
      // Assuming latestAssistantMessage.content is an array with objects that have a 'text' property
      returnStatement = latestAssistantMessage.content.map((content: any) => content.text ? content.text.value : '').join(' ');
      console.log('Latest assistant response:', returnStatement);
    } else {
      console.log('No latest assistant response found');
    }

    // Return both the text and the threadId to be reused
    return { text: returnStatement, newThreadId: threadId };
  } catch (error: any) {
    console.error('Error generating text:', error.response?.data || error.message);
    throw error;
  }
};


export const generateImage = async (prompt: string, apiKey: string): Promise<string> => {
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
  };

  try {
    const response = await axios.post<OpenAIResponse<ImageData[]>>(
      'https://api.openai.com/v1/images/generations',
      {
        prompt: prompt,
        n: 1,
        size: "1792x1024",
        model: 'dall-e-3',
        quality: 'hd',
        style: 'natural'
      },
      { headers }
    );
    return response.data.data[0].url;
  } catch (error: any) {
    const axiosError = error as AxiosError;
    console.error('Error generating image:', axiosError.response?.data || axiosError.message);
    // Log the full error response for debugging
    console.log(axiosError.response?.data);
    throw axiosError;
  }
};

export const generateAudio = async (text: string, voice: string, apiKey: string): Promise<string> => {
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
  };

  try {
    const response: AxiosResponse<Blob> = await axios.post(
      'https://api.openai.com/v1/audio/speech',
      {
        model: "tts-1",
        voice: voice,
        input: text,
      },
      {
        headers: headers,
        responseType: 'blob' // Set the response type to 'blob' to handle binary data
      }
    );

    // Create a blob URL for the audio file
    const audioBlob = new Blob([response.data], { type: 'audio/mpeg' });
    const audioUrl = URL.createObjectURL(audioBlob);
    return audioUrl;
  } catch (error: any) {
    console.error('Error generating audio:', error);
    throw error;
  }
};