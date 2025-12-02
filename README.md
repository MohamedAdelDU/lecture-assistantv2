# Lecture Assistant

A web application that analyzes YouTube lecture videos using AI to generate summaries, quizzes, slides, and flashcards.

## Features

- 📹 **YouTube Video Analysis**: Extract transcripts and metadata from YouTube videos
- ⏱️ **Time Range Selection**: Select specific time ranges from videos to extract transcripts
- 🤖 **AI-Powered Summaries**: Long-form abstractive summaries using Gemini API with full Arabic/English support
- 📝 **Interactive Quizzes**: AI-generated multiple-choice questions with review mode and multiple quiz types
- 📊 **Slides Generation**: Automatic slide creation with multiple themes (Clean, Dark, Academic, Modern, Tech) and customizable colors
- 🎴 **Flashcards**: Study cards for key concepts
- 🌐 **Multi-language Support**: Full Arabic/English support with RTL/LTR layout and automatic language detection
- 🎨 **Customizable Themes**: Multiple slide themes with unique fonts and color suggestions
- 🔧 **Model Selection**: Choose between GPU (Ollama) and Cloud (Gemini API) models
- 🔐 **Authentication**: Firebase Auth with email/password and Google Sign-in
- 💾 **Cloud Storage**: Firebase Firestore for data persistence
- 📥 **Export Options**: Download slides as PowerPoint (.pptx) files with full Arabic support

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Wouter, Framer Motion
- **Backend**: Node.js, Express
- **AI Models**: 
  - Google Gemini 2.5 Flash (Cloud API)
  - Ollama with Qwen2.5:7b (Local GPU)
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Hosting**: Firebase Hosting
- **Slide Generation**: pptxgenjs
- **YouTube API**: youtube-transcript-api (Python)

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
   
   Required Python packages:
   - `youtube-transcript-api`: For extracting YouTube video transcripts
   - `python-dotenv`: For environment variable management

6. **Configure Python path** (if needed)
   Ensure Python is accessible from your system PATH, or update the Python path in `server/routes.ts` if using a custom Python installation.

## Key Features Details

### Time Range Selection
Select specific time ranges from YouTube videos to extract transcripts. This is useful for:
- Focusing on specific lecture segments
- Extracting content from long videos
- Creating summaries for specific topics

### Model Selection
Choose between two AI models:
- **LM-Titan (GPU)**: Local Ollama model running on your GPU for faster processing
- **LM-Cloud (API)**: Google Gemini API for cloud-based processing

### Slide Themes
Five professional themes available:
- **Clean**: Minimalist design with purple accents
- **Dark**: Modern dark theme with green highlights
- **Academic**: Traditional academic style with blue tones
- **Modern**: Vibrant purple gradient design
- **Tech**: Tech-focused dark theme with cyan accents

Each theme includes:
- Unique font family
- Suggested color palette
- Customizable colors

### Language Support
Full support for Arabic and English:
- Automatic language detection
- RTL/LTR layout switching
- Proper text alignment
- Arabic font support in PowerPoint exports

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
- `POST /api/youtube/transcript` - Extract video transcript (supports time range selection)
- `POST /api/ai/summary` - Generate AI summary (supports Arabic/English)
- `POST /api/ai/quiz` - Generate quiz questions
- `POST /api/ai/slides` - Generate slide deck from transcript
- `POST /api/ai/slides/download` - Download slides as PowerPoint (.pptx)
- `POST /api/summarize` - General text summarization

## Project Structure

```
.
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── pages/            # Page components
│   │   ├── lib/              # Utility libraries
│   │   └── styles/           # Global styles
├── server/                    # Express backend
│   ├── routes.ts             # API routes
│   └── scripts/              # Python scripts
│       └── get_transcript.py # YouTube transcript extractor
├── script/                   # Build scripts
└── dist/                     # Production build
```

## Troubleshooting

### YouTube Transcript Issues
- Ensure the video has captions enabled (CC)
- Some videos may only have auto-generated captions
- Time range selection requires valid start/end times

### AI Model Errors
- **Gemini API**: Check your API key and quota limits
- **Ollama**: Ensure Ollama is running locally on port 11434
- Model fallback: The app will automatically fallback to available models

### PowerPoint Download Issues
- Ensure filenames don't contain invalid characters
- Arabic filenames are automatically sanitized for compatibility
- Check browser download permissions

### RTL/LTR Layout Issues
- Language is automatically detected from content
- Manual override available in settings
- Ensure proper font support for Arabic text

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

