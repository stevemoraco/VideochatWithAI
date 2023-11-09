import React, { useState } from 'react';

interface ApiKeyFormProps {
  onSubmit: (key: string) => void; // Define the onSubmit prop
}

const ApiKeyForm: React.FC<ApiKeyFormProps> = ({ onSubmit }) => {
  const [apiKey, setApiKey] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(apiKey); // Call the onSubmit function passed as a prop
  };

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="api-key">OpenAI API Key:</label>
      <input
        id="api-key"
        type="text"
        value={apiKey}
        onChange={(e) => setApiKey(e.target.value)}
        placeholder="Enter your OpenAI API Key"
      />
      <button type="submit">Submit</button>
    </form>
  );
};

export default ApiKeyForm;
