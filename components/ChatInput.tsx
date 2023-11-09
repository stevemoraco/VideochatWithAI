import React, { useState, useContext } from 'react';
import { ChatContext } from '../context/ChatContext';

const ChatInput: React.FC = () => {
  const [input, setInput] = useState('');
  const { sendMessage } = useContext(ChatContext);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleSend = () => {
    if (input.trim()) {
      sendMessage(input);
      setInput('');
    }
  };

  return (
    <div className="chat-input">
      <input
        type="text"
        value={input}
        onChange={handleInputChange}
        placeholder="Type your message here..."
      />
      <button onClick={handleSend}>Send</button>
    </div>
  );
};

export default ChatInput;