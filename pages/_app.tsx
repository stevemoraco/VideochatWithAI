import React from 'react';
import { AppProps } from 'next/app';
import { ChatProvider } from '../context/ChatContext';
import '../styles/globals.css';

const MyApp: React.FC<AppProps> = ({ Component, pageProps }) => {
  return (
    <ChatProvider>
      <Component {...pageProps} />
    </ChatProvider>
  );
};

export default MyApp;