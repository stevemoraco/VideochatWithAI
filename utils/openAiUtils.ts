import axios, { AxiosError } from 'axios';

export const createAssistant = async (apiKey: string, instructions: string, name: string) => {
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'OpenAI-Beta': 'assistants=v1'
  };

  try {
    const assistantResponse = await axios.post(
      'https://api.openai.com/v1/assistants',
      {
        name: `Zoom Room With ${name}`,
        instructions: instructions,
        model: "gpt-4-1106-preview",
      },
      { headers }
    );

    return assistantResponse.data.id;
  } catch (error: any) {
    console.error('Error creating assistant:', error.response?.data || error.message);
    throw error;
  }
};

  export const generateText = async (
    prompt: string,
    apiKey: string,
    assistantId: string | null | undefined,
    threadId: string | null | undefined = null,
    retryCount: number = 3
  ) => {
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'OpenAI-Beta': 'assistants=v1'
  };

  try {
    if (!threadId) {
      const threadResponse = await axios.post(
        'https://api.openai.com/v1/threads',
        {},
        { headers }
      );
      threadId = threadResponse.data.id;
    }

    await axios.post(
      `https://api.openai.com/v1/threads/${threadId}/messages`,
      {
        role: "user",
        content: prompt
      },
      { headers }
    );

    let runResponse;
    let runStatus;
    let retryAttempts = 0;

    do {
      runResponse = await axios.post(
        `https://api.openai.com/v1/threads/${threadId}/runs`,
        {
          assistant_id: assistantId,
        },
        { headers }
      );

      runStatus = runResponse.data.status;
      while (runStatus !== 'completed' && runStatus !== 'failed') {
        const statusResponse = await axios.get(
          `https://api.openai.com/v1/threads/${threadId}/runs/${runResponse.data.id}`,
          { headers }
        );
        runStatus = statusResponse.data.status;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (runStatus === 'failed') {
        retryAttempts++;
      }
    } while (runStatus === 'failed' && retryAttempts < retryCount);

    if (runStatus === 'failed') {
      throw new Error('Assistant run failed after retry attempts');
    }

    const messagesResponse = await axios.get(
      `https://api.openai.com/v1/threads/${threadId}/messages`,
      { headers }
    );

    const assistantMessages = messagesResponse.data.data
      .filter((message: any) => message.role === 'assistant')
      .sort((a: any, b: any) => (b.created_at || 0) - (a.created_at || 0));

    const latestAssistantMessage = assistantMessages[0];
    let returnStatement = '';
    if (latestAssistantMessage && latestAssistantMessage.content) {
      returnStatement = latestAssistantMessage.content.map((content: any) => content.text ? content.text.value : '').join(' ');
    }

    return { text: returnStatement, newThreadId: threadId };
  } catch (error: any) {
    console.error('Error generating text:', error.response?.data || error.message);
    throw error;
  }
};

export const generateImage = async (prompt: string, apiKey: string) => {
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
  };

  try {
    const response = await axios.post(
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
    console.error('Error generating image:', error.response?.data || error.message);
    throw error;
  }
};

export const generateAudio = async (text: string, voice: string, apiKey: string) => {
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
  };

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/audio/speech',
      {
        model: "tts-1",
        voice: voice,
        input: text,
      },
      {
        headers: headers,
        responseType: 'blob'
      }
    );

    const audioBlob = new Blob([response.data], { type: 'audio/mpeg' });
    let audioUrl = '';
    if (URL) {
      audioUrl = URL.createObjectURL(audioBlob);
    }
    return audioUrl;
  } catch (error) {
    console.error('Error generating audio:', error);
    throw error;
  }
};


export async function gptCustomRequest(
  model: string,
  temperature: number,
  content: string, // This should be a plain text string, not JSON stringified
  prompt: string, // This should be a plain text string, not JSON stringified
  maxTokens: number,
  apiKey: string,
  base64Image: string | null = null // Pass the base64 image string directly
) {
  try {
    const messages = [
      {
        role: 'system',
        content: content, // Directly pass the content string
      },
      {
        role: 'user',
        content: prompt, // Directly pass the prompt string
      },
    ];

    // If a base64 image is provided, add it to the messages array
    /*
    if (base64Image) {
      messages.push({
        role: 'user',
        content: {
          type: 'image_base64', // Specify the type as image_base64
          data: base64Image, // Pass the base64 image data
        },
      });
    }*/

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: model,
        max_tokens: maxTokens,
        temperature: temperature,
        messages: messages,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
      }
    );

    return response.data.choices[0].message.content;
  } catch (error: any) {
    console.error('Error in gptCustomRequest:', error.message);
    if (error.response) {
      console.error('Error data:', error.response.data.error);
      return error.response.data.error.message;
    }
    throw error; // Re-throw the error if it's not an Axios error
  }
}  