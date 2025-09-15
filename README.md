<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# VisitWight.AI - Your Sovereign Experience

An immersive AI-powered experience for exploring the Isle of Wight. This application combines the power of Google's Gemini AI with ElevenLabs voice synthesis to create a unique interactive experience.

## Features

- AI-powered chat interface using Google Gemini
- Voice synthesis via ElevenLabs
- Interactive map with points of interest
- Weather information and itinerary suggestions
- Avatar-based UI components

## Prerequisites

- Node.js (v14 or higher)
- Google Gemini API key
- ElevenLabs API key

## Setup Instructions

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file in the root directory with your API keys:
   ```env
   API_KEY=your_google_gemini_api_key_here
   ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Build for production:
   ```bash
   npm run build
   ```

5. Preview the production build:
   ```bash
   npm run preview
   ```

## Deploying to GitHub

To deploy this application to a new GitHub repository:

1. Create a new repository on GitHub (do not initialize with README)
2. Add the remote origin:
   ```bash
   git remote add origin https://github.com/yourusername/your-repo-name.git
   ```
3. Push to GitHub:
   ```bash
   git push -u origin main
   ```

## API Keys Configuration

- `API_KEY`: Your Google Gemini API key (required for AI chat functionality)
- `ELEVENLABS_API_KEY`: Your ElevenLabs API key (required for voice synthesis)

You can obtain these keys from:
- Google Gemini: https://ai.google.dev/
- ElevenLabs: https://elevenlabs.io/

## Project Structure

- `App.tsx`: Main application component
- `components/`: UI components (Avatar, Chat, Map, Weather, etc.)
- `hooks/`: Custom hooks (useAudioPlayer)
- `services/`: API integrations (Gemini, ElevenLabs)
- `types.ts`: Shared TypeScript types
- `constants.ts`: Shared constants
- `vite.config.ts`: Vite configuration

## Learn More

To learn more about the technologies used in this project:

- [Vite](https://vitejs.dev/)
- [React](https://reactjs.org/)
- [Google Gemini API](https://ai.google.dev/)
- [ElevenLabs API](https://elevenlabs.io/)