import React, { createContext, useState } from 'react';

export interface IMessage {
  sender: 'user' | 'ai';
  text: string;
}

export interface IChatContext {
  apiKey: string;
  isLoading: boolean;
  characterImage: string;
  messages: IMessage[];
  setApiKeyValue: (key: string) => void;
  sendMessage: (message: string) => void;
  addMessage: (message: IMessage) => void;
  setCharacterImage: (imageUrl: string) => void; // Add this line
}

export const ChatContext = createContext<IChatContext>({
  apiKey: '',
  isLoading: false,
  characterImage: '',
  messages: [],
  setApiKeyValue: () => {},
  sendMessage: () => {},
  addMessage: () => {},
  setCharacterImage: () => {}, // Implement this function
});

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => { // Correctly type the children prop
  const [apiKey, setApiKey] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [characterImage, setCharacterImageState] = useState<string>(''); // Rename to avoid naming conflict
  const [messages, setMessages] = useState<IMessage[]>([]);

  const setApiKeyValue = (key: string) => {
    setApiKey(key);
  };

  const sendMessage = (message: string) => {
    // Implementation for sending a message
  };

  const addMessage = (message: IMessage) => {
    setMessages((prevMessages) => [...prevMessages, message]);
  };

  const setCharacterImage = (imageUrl: string) => {
    setCharacterImageState(imageUrl); // Use the state setter function
  };

  return (
    <ChatContext.Provider
      value={{
        apiKey,
        isLoading,
        characterImage,
        messages,
        setApiKeyValue,
        sendMessage,
        addMessage,
        setCharacterImage, // Provide this function to the context
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};