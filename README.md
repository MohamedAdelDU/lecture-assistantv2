# Lecture Assistant

A web application that analyzes YouTube lecture videos using AI to generate summaries, quizzes, slides, and flashcards.

## Features

- 📹 **YouTube Video Analysis**: Extract transcripts and metadata from YouTube videos
- 🤖 **AI-Powered Summaries**: Long-form abstractive summaries using Gemini API
- 📝 **Interactive Quizzes**: AI-generated multiple-choice questions with review mode
- 📊 **Slides Generation**: Automatic slide creation from lecture content
- 🎴 **Flashcards**: Study cards for key concepts
- 🌐 **Multi-language Support**: Full Arabic/English support with RTL/LTR layout
- 🔐 **Authentication**: Firebase Auth with email/password and Google Sign-in
- 💾 **Cloud Storage**: Firebase Firestore for data persistence

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Wouter
- **Backend**: Node.js, Express
- **AI**: Google Gemini API, Ollama (fallback)
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Hosting**: Firebase Hosting

## Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/MohamedAdelDU/lecture-assistantv2.git
   cd lecture-assistantv2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key
   OLLAMA_URL=http://localhost:11434
   OLLAMA_MODEL=qwen2.5:7b
   ```

4. **Set up Firebase**
   - Create a Firebase project
   - Copy your Firebase config to `client/src/lib/firebase.ts`
   - Deploy Firestore rules: `npx firebase deploy --only firestore:rules`

5. **Install Python dependencies** (for YouTube transcript extraction)
   ```bash
   pip install -r requirements.txt
   ```

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Deployment

### Firebase Hosting

```bash
# Build and deploy
npm run deploy:hosting
```

The app is available at: `https://lecture-assistant-ab472.web.app`

### Backend API

The backend API endpoints need to be deployed separately. Options:
- Firebase Functions
- Cloud Run
- Railway, Render, or similar services

## API Endpoints

- `POST /api/youtube/info` - Get YouTube video metadata
- `POST /api/youtube/transcript` - Extract video transcript
- `POST /api/ai/summary` - Generate AI summary
- `POST /api/ai/quiz` - Generate quiz questions
- `POST /api/summarize` - General text summarization

## Project Structure

```
.
├── client/          # React frontend
├── server/          # Express backend
├── script/          # Build scripts
└── dist/            # Production build
```

## License

MIT

