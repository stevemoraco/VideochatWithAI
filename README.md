# AI Video Chat Application

## Introduction
Embark on a futuristic journey of interaction with AI-generated personalities via a video chat interface. Users can summon any character for a virtual face-to-face conversation, where the app not only crafts a visual representation using DALL·E 3 but also brings the persona to life through voice and responsive visual feedback using OpenAI's latest GPT-4 with vision capabilities.

## Features
- Dynamic Character Visualization: Choose any character for a chat and witness their AI-generated image come to life with DALL·E 3.
- Interactive AI Conversations: Engage in fluid conversations as OpenAI's GPT models craft text responses in real-time.
- Voice Synthesis: Experience the character's responses audibly, transformed from text to speech using OpenAI's API.
- Visual Interaction: Utilize GPT-4's vision capabilities to analyze your webcam footage, allowing the AI to respond to your visual cues and transcribed audio for an immersive chat experience.
- Personal API Integration: Run the application with your own OpenAI API key for a personalized and secure experience.

## Technologies Used
- Next.js: A robust React framework designed for production-ready applications.
- TypeScript: A typed superset of JavaScript, ensuring more predictable code.
- OpenAI's DALL·E 3: For generating detailed images of characters based on user prompts.
- OpenAI's GPT-4 Models: For generating intelligent and contextual text responses.
- OpenAI's GPT-4 with Vision: To analyze visual input from the user's webcam and enhance the interactive experience.
- OpenAI's Text-to-Speech: To vocalize the AI character's text responses, simulating a real-time conversation.

## Installation and Setup
Instructions on how to install and set up the project locally.

## User Story
- API Key Entry: Upon launching the application, you will be prompted to enter your OpenAI API key.
- Character Selection: Enter the name or description of the character you wish to chat with.
- Image Generation: The app uses DALL·E 3 to generate an image of the character.
- Voice Chat Initialization: The app crafts an initial response in a random voice.
- Webcam and Microphone Access: The app requests access to your webcam and microphone.
- Recording Your Reply: The app records your reply and captures snapshots through your webcam.
- Interactive Dialogue: Your audio is transcribed and sent to the app along with webcam images.
- Continuous Conversation: The dialogue with the AI character continues as long as you wish.

## Contributions
Information on how to contribute to the project for developers interested in enhancing the application's features.

## License
Details regarding the licensing of the project.

### File Tree Structure

```
ai-video-chat-app/
│
├── public/                  # Static files and assets
│   ├── favicon.ico          # Favicon for the web app
│   └── svgs/                # SVG assets for UI components
│       ├── microphone.svg   # Icon for the microphone
│       └── camera.svg       # Icon for the camera
│
├── src/
│   ├── components/          # Reusable components
│   │   ├── ChatBox.tsx      # Main chat interface component
│   │   ├── ChatInput.tsx    # Input component for user messages
│   │   ├── Spinner.tsx      # Loading spinner component
│   │   ├── WebcamRecorder.tsx # Component to handle webcam and microphone interactions
│   │   └── ApiKeyForm.tsx   # Form component for entering the OpenAI API key
│   │
│   ├── context/             # Context for global state management
│   │   └── ChatContext.tsx  # Context provider for chat-related state
│   │
│   ├── pages/               # Pages for the application
│   │   ├── _app.tsx         # Custom App component for global state
│   │   ├── index.tsx        # Home page with video chat interface
│   │   └── api/
│   │       └── transcribe.ts # API route for handling audio transcription
│   │
│   ├── styles/              # CSS modules for styling
│   │   ├── globals.css      # Global styles
│   │   └── ChatBox.module.css  # Styles for the chat box component
│   │
│   ├── types/               # Custom TypeScript type definitions
│   │   └── index.d.ts       # Type definitions for the project
│   │
│   ├── utils/               # Utility functions
│   │   ├── audioUtils.ts    # Utility functions for audio recording and processing
│   │   ├── openaiUtils.ts   # Utility functions for interacting with OpenAI APIs
│   │   └── cookieUtils.ts   # Utility functions for cookie management
│   │
│   ├── hooks/               # Custom React hooks
│   │   └── useRecorder.ts   # Hook for managing audio recording logic and state
│   │
│   └── lib/                 # Library for shared functionalities
│       └── api.ts           # Shared API handlers for OpenAI services
│
├── .env.local               # Environment variables
├── package.json             # Project metadata and dependencies
├── tsconfig.json            # TypeScript configuration
├── next.config.js           # Next.js configuration
├── README.md                # Project README file
└── CONTRIBUTING.md          # Contribution guidelines