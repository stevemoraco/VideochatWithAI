import React, { useContext } from 'react';
import { ChatContext } from '../context/ChatContext';
import WebcamRecorder from './WebcamRecorder';
import ChatInput from './ChatInput';
import Spinner from './Spinner';

const ChatBox: React.FC = () => {
  const { isLoading, characterImage, messages } = useContext(ChatContext);

  return (
    <div className="chat-box">
      {isLoading ? (
        <Spinner />
      ) : (
        <>
          <div className="character-image">
            {characterImage && <img src={characterImage} alt="AI Character" />}
          </div>
          <div className="messages">
            {messages.map((message, index) => (
              <div key={index} className={`message ${message.sender}`}>
                <p>{message.text}</p>
              </div>
            ))}
          </div>
          <WebcamRecorder />
          <ChatInput />
        </>
      )}
    </div>
  );
};

export default ChatBox;