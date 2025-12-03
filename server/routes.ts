import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync, unlinkSync, mkdirSync } from "fs";
import { GoogleGenerativeAI } from "@google/generative-ai";
import pptxgen from "pptxgenjs";
import multer from "multer";
import os from "os";
import { uploadAudioToFirebase, checkAudioExists, downloadAudioFromFirebase } from "./firebaseStorage";

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to get Python scripts directory
// In production (dist/), scripts are in ../server/scripts/
// In development, scripts are in ./scripts/
function getScriptsDir(): string {
  // Check if we're in dist/ (production build)
  if (__dirname.includes("dist")) {
    // In production, go up to project root then to server/scripts
    return path.resolve(__dirname, "..", "server", "scripts");
  }
  // In development, scripts are relative to current directory
  return path.join(__dirname, "scripts");
}

// Helper function to get the correct Python command based on OS
function getPythonCommand(): string {
  // Check for custom Python command from environment
  if (process.env.PYTHON_CMD) {
    return process.env.PYTHON_CMD;
  }
  
  // Check for venv Python
  const venvPython = path.join(__dirname, "..", "venv", "bin", "python3");
  if (existsSync(venvPython)) {
    return venvPython;
  }
  
  // Check for Windows venv
  const venvPythonWindows = path.join(__dirname, "..", "venv", "Scripts", "python.exe");
  if (existsSync(venvPythonWindows)) {
    return venvPythonWindows;
  }
  
  // Use platform-specific default
  // On Windows, use 'python', on Unix-like systems use 'python3'
  return process.platform === "win32" ? "python" : "python3";
}

// Configure multer for file uploads
const uploadDir = path.join(os.tmpdir(), "lecture-assistant-uploads");
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

const storageConfig = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `audio-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage: storageConfig,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Accept audio and video files
    const allowedMimes = [
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/webm",
      "audio/ogg",
      "audio/m4a",
      "video/mp4",
      "video/webm",
      "video/ogg",
      "video/quicktime",
      "audio/x-m4a",
      "audio/mp4",
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed types: ${allowedMimes.join(", ")}`));
    }
  },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  // put application routes here
  // prefix all routes with /api

  /**
   * YouTube video info extraction endpoint (title, thumbnail, duration, etc.)
   * Uses Python script with yt-dlp (scripts/get_video_info.py)
   */
  app.post("/api/youtube/info", async (req: Request, res: Response) => {
    try {
      const { videoId } = req.body;

      if (!videoId || typeof videoId !== "string") {
        return res.status(400).json({ error: "Video ID is required" });
      }

      console.log(`[API] Fetching video info for: ${videoId}`);

      try {
        const pythonCmd = getPythonCommand();
        const pythonScript = path.join(getScriptsDir(), "get_video_info.py");
        const { stdout, stderr } = await execAsync(
          `${pythonCmd} "${pythonScript}" "${videoId}"`,
        );

        if (stderr) {
          console.error(`[API] Python stderr (video info):`, stderr);
        }

        const result = JSON.parse(stdout.trim());

        if (!result.success) {
          return res.status(404).json({
            error: result.error || "Failed to fetch video information",
            details: result.details || "Could not retrieve video details from YouTube.",
          });
        }

        console.log(`[API] Video info fetched successfully:`, {
          title: result.title,
          duration: result.duration,
          channel: result.channelName,
        });

        res.json({
          videoId: result.videoId,
          title: result.title,
          thumbnailUrl: result.thumbnailUrl,
          duration: result.duration,
          channelName: result.channelName,
          durationSeconds: result.durationSeconds,
        });
      } catch (pythonError: any) {
        console.error("[API] Error calling Python script for video info:", pythonError);
        res.status(500).json({
          error: "Failed to fetch video info via Python script",
          details: pythonError.message || "Unknown error",
        });
      }
    } catch (error: any) {
      console.error("[API] Error in video info endpoint:", error);
      res.status(500).json({ error: "Failed to fetch video info" });
    }
  });

  /**
   * YouTube transcript extraction endpoint
   * Uses Python script scripts/get_transcript.py (youtube_transcript_api)
   */
  app.post("/api/youtube/transcript", async (req: Request, res: Response) => {
    try {
      const { videoId, startTime, endTime } = req.body;

      if (!videoId || typeof videoId !== "string") {
        return res.status(400).json({ error: "Video ID is required" });
      }

      const startTimeSeconds = startTime !== undefined && startTime !== null ? parseFloat(startTime) : null;
      const endTimeSeconds = endTime !== undefined && endTime !== null ? parseFloat(endTime) : null;

      console.log(`[API] Fetching transcript for video: ${videoId}${startTimeSeconds !== null ? ` (from ${startTimeSeconds}s)` : ''}${endTimeSeconds !== null ? ` (to ${endTimeSeconds}s)` : ''}`);

      try {
        console.log(`[API] Calling Python script to fetch transcript...`);
        const pythonScript = path.join(getScriptsDir(), "get_transcript.py");

        // Build command with optional time parameters
        const pythonCmd = getPythonCommand();
        let command = `${pythonCmd} "${pythonScript}" "${videoId}"`;
        if (startTimeSeconds !== null) {
          command += ` "${startTimeSeconds}"`;
        }
        if (endTimeSeconds !== null) {
          command += ` "${endTimeSeconds}"`;
        }

        const { stdout, stderr } = await execAsync(command);

        if (stderr) {
          console.error(`[API] Python stderr:`, stderr);
        }

        const result = JSON.parse(stdout.trim());

        if (!result.success) {
          return res.status(404).json({
            error: result.error || "No transcript available for this video",
            details:
              result.details || "The video may not have captions enabled.",
          });
        }

        const fullTranscript = result.transcript;

        if (!fullTranscript || fullTranscript.length === 0) {
          return res.status(404).json({
            error: "No transcript text found",
            details: "The transcript exists but contains no text.",
          });
        }

        console.log(
          `[API] Successfully fetched transcript (${fullTranscript.length} characters, ${result.wordCount} words, language: ${result.language})`,
        );

        res.json({
          transcript: fullTranscript,
          wordCount: result.wordCount,
          characterCount: fullTranscript.length,
          language: result.language,
        });
        return;
      } catch (pythonError: any) {
        console.error("[API] Error calling Python script for transcript:", pythonError);

        let errorMessage = "Failed to extract transcript";
        if (
          pythonError.message?.includes("No module named 'youtube_transcript_api'")
        ) {
          errorMessage =
            "Python 'youtube_transcript_api' not installed. Please run 'pip install youtube-transcript-api'.";
        } else if (pythonError.message?.includes("No transcript available")) {
          errorMessage =
            "No transcript available for this video. The video may not have captions.";
        } else if (pythonError.message?.includes("Transcripts are disabled")) {
          errorMessage = "Transcripts are disabled for this video by the creator.";
        }

        res.status(500).json({
          error: errorMessage,
          details: pythonError.message,
        });
      }
    } catch (error: any) {
      console.error("[API] Error in transcript endpoint:", error);
      res.status(500).json({ error: "Failed to extract transcript" });
    }
  });

  /**
   * YouTube audio download and transcription endpoint using Faster Whisper
   * Downloads audio from YouTube and converts it to text using Whisper
   * Saves audio files to Firebase Storage for future use
   */
  app.post("/api/youtube/transcribe", async (req: Request, res: Response) => {
    let downloadedFilePath: string | null = null;
    // Get userId from request body or auth (if available)
    const userId = req.body.userId || (req as any).user?.uid || "anonymous";
    
    // Set longer timeout and keep-alive headers to prevent proxy timeout
    req.setTimeout(600000); // 10 minutes timeout
    res.setTimeout(600000); // 10 minutes timeout
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Keep-Alive', 'timeout=600, max=1000');
    res.setHeader('Cache-Control', 'no-cache');
    
    // Send periodic keep-alive chunks to prevent proxy timeout (chunked transfer encoding)
    let keepAliveInterval: NodeJS.Timeout | null = null;
    const startKeepAlive = () => {
      if (!res.headersSent) {
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Transfer-Encoding': 'chunked',
          'Connection': 'keep-alive',
          'Keep-Alive': 'timeout=600, max=1000',
        });
      }
      
      keepAliveInterval = setInterval(() => {
        if (!res.writableEnded && res.writable) {
          try {
            res.write('\n'); // Send newline to keep connection alive
          } catch (e) {
            // Connection closed, stop keep-alive
            if (keepAliveInterval) {
              clearInterval(keepAliveInterval);
              keepAliveInterval = null;
            }
          }
        } else {
          if (keepAliveInterval) {
            clearInterval(keepAliveInterval);
            keepAliveInterval = null;
          }
        }
      }, 20000); // Every 20 seconds
    };
    
    // Start keep-alive after a short delay
    setTimeout(startKeepAlive, 5000);
    
    // Clean up interval on finish or error
    const cleanup = () => {
      if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
      }
    };
    res.on('finish', cleanup);
    res.on('close', cleanup);
    
    try {
      const { videoId, startTime, endTime, modelSize = "large-v3", language, device = "cuda" } = req.body;

      if (!videoId || typeof videoId !== "string") {
        return res.status(400).json({ error: "Video ID is required" });
      }

      const startTimeSeconds = startTime !== undefined && startTime !== null ? parseFloat(startTime) : null;
      const endTimeSeconds = endTime !== undefined && endTime !== null ? parseFloat(endTime) : null;

      console.log(`[API] Downloading and transcribing YouTube video: ${videoId}`);
      console.log(`[API] Time range: ${startTimeSeconds || 0}s - ${endTimeSeconds || "end"}`);
      console.log(`[API] Model: ${modelSize}, Language: ${language || "auto"}, Device: ${device}`);

      // Check if audio already exists in Firebase Storage (only if no time range specified)
      let audioUrl: string | null = null;
      if (startTimeSeconds === null && endTimeSeconds === null) {
        try {
          audioUrl = await checkAudioExists(userId, videoId);
          if (audioUrl) {
            console.log(`[API] Audio file found in Firebase Storage: ${audioUrl}`);
            // Download from Firebase to temp file for transcription
            const tempFile = path.join(os.tmpdir(), `firebase-${videoId}-${Date.now()}.mp3`);
            await downloadAudioFromFirebase(userId, videoId, tempFile);
            downloadedFilePath = tempFile;
          }
        } catch (firebaseError) {
          console.warn(`[API] Could not check Firebase Storage, proceeding with YouTube download:`, firebaseError);
        }
      }

      try {
        // Get Python command (needed for both download and transcription)
        const pythonCmd = getPythonCommand();
        
        // Step 1: Download audio from YouTube (if not found in Firebase)
        if (!downloadedFilePath) {
          const downloadScript = path.join(getScriptsDir(), "download_youtube_audio.py");
          
          let downloadCommand = `${pythonCmd} "${downloadScript}" "${videoId}"`;
          if (startTimeSeconds !== null) {
            downloadCommand += ` "${startTimeSeconds}"`;
          } else {
            downloadCommand += ` "None"`;
          }
          if (endTimeSeconds !== null) {
            downloadCommand += ` "${endTimeSeconds}"`;
          } else {
            downloadCommand += ` "None"`;
          }

          console.log(`[API] Downloading audio from YouTube...`);
          const { stdout: downloadStdout, stderr: downloadStderr } = await execAsync(downloadCommand);

          if (downloadStderr) {
            console.error(`[API] Python stderr (download):`, downloadStderr);
          }

          const downloadResult = JSON.parse(downloadStdout.trim());

          if (!downloadResult.success) {
            return res.status(500).json({
              error: downloadResult.error || "Failed to download audio from YouTube",
              details: downloadResult.details || "Could not download audio file.",
            });
          }

          downloadedFilePath = downloadResult.filePath;
          console.log(`[API] Audio downloaded successfully: ${downloadedFilePath} (${(downloadResult.fileSize / 1024 / 1024).toFixed(2)} MB)`);

          // Upload to Firebase Storage (only if no time range specified)
          if (startTimeSeconds === null && endTimeSeconds === null && userId !== "anonymous" && downloadedFilePath) {
            try {
              audioUrl = await uploadAudioToFirebase(downloadedFilePath, userId, videoId);
              console.log(`[API] Audio uploaded to Firebase Storage: ${audioUrl}`);
            } catch (uploadError) {
              console.warn(`[API] Could not upload to Firebase Storage:`, uploadError);
              // Continue even if upload fails
            }
          }
        }

        // Step 2: Transcribe using Whisper
        if (!downloadedFilePath) {
          return res.status(500).json({
            error: "No audio file available for transcription",
            details: "Failed to download or retrieve audio file.",
          });
        }
        
        const transcribeScript = path.join(getScriptsDir(), "transcribe_audio.py");
        
        let transcribeCommand = `${pythonCmd} "${transcribeScript}" "${downloadedFilePath}" "${modelSize}"`;
        if (language) {
          transcribeCommand += ` "${language}"`;
        } else {
          transcribeCommand += ` "None"`;
        }
        transcribeCommand += ` "${device}"`;

        console.log(`[API] Transcribing audio with Whisper...`);
        const { stdout: transcribeStdout, stderr: transcribeStderr } = await execAsync(transcribeCommand);

        if (transcribeStderr) {
          console.error(`[API] Python stderr (transcription):`, transcribeStderr);
        }

        const transcribeResult = JSON.parse(transcribeStdout.trim());

        if (!transcribeResult.success) {
          return res.status(500).json({
            error: transcribeResult.error || "Transcription failed",
            details: transcribeResult.details || "Could not transcribe audio file.",
          });
        }

        const transcript = transcribeResult.transcript;

        if (!transcript || transcript.length === 0) {
          return res.status(404).json({
            error: "No transcript text found",
            details: "The transcription completed but contains no text.",
          });
        }

        console.log(
          `[API] Successfully transcribed YouTube audio (${transcript.length} characters, ${transcribeResult.wordCount} words, language: ${transcribeResult.language})`,
        );

        // Stop keep-alive before sending final response
        cleanup();
        
        res.json({
          transcript,
          wordCount: transcribeResult.wordCount,
          characterCount: transcribeResult.characterCount || transcript.length,
          language: transcribeResult.language,
          audioUrl: audioUrl || undefined, // Include Firebase Storage URL if available
        });
      } catch (pythonError: any) {
        console.error("[API] Error in YouTube transcription:", pythonError);

        let errorMessage = "Failed to transcribe YouTube audio";
        if (pythonError.message?.includes("No module named 'yt_dlp'")) {
          errorMessage = "Python 'yt-dlp' not installed. Please run 'pip install yt-dlp'.";
        } else if (pythonError.message?.includes("No module named 'faster_whisper'")) {
          errorMessage = "Python 'faster-whisper' not installed. Please run 'pip install faster-whisper'.";
        }

        res.status(500).json({
          error: errorMessage,
          details: pythonError.message,
        });
      }
    } catch (error: any) {
      console.error("[API] Error in YouTube transcription endpoint:", error);
      res.status(500).json({ error: "Failed to transcribe YouTube audio" });
    } finally {
      // Clean up downloaded file
      if (downloadedFilePath && existsSync(downloadedFilePath)) {
        try {
          unlinkSync(downloadedFilePath);
          console.log(`[API] Cleaned up downloaded file: ${downloadedFilePath}`);
        } catch (cleanupError) {
          console.error(`[API] Error cleaning up file: ${cleanupError}`);
        }
      }
    }
  });

  /**
   * Audio file transcription endpoint using Faster Whisper
   * Accepts audio/video files and converts them to text transcript
   */
  app.post("/api/audio/transcribe", upload.single("audio"), async (req: Request, res: Response) => {
    let uploadedFilePath: string | null = null;
    
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No audio file uploaded" });
      }

      uploadedFilePath = req.file.path;
      
      // Extract parameters from FormData (multer puts them in req.body)
      // Default to large-v3 for best quality (especially on GPU/RunPod)
      const modelSize = req.body.modelSize || "large-v3";
      const language = req.body.language || undefined;
      // Support both "gpu" and "cuda" for GPU device
      // Default to cuda for RunPod/GPU environments
      let device = req.body.device || "cuda";
      if (device === "gpu") {
        device = "cuda";
      }
      
      // Log configuration for debugging
      console.log(`[API] Whisper Configuration:`, {
        modelSize,
        device,
        language: language || "auto-detect",
        fileSize: `${(req.file.size / 1024 / 1024).toFixed(2)} MB`
      });

      console.log(`[API] Transcribing audio file: ${req.file.originalname} (${req.file.size} bytes)`);
      console.log(`[API] Model: ${modelSize}, Language: ${language || "auto"}, Device: ${device}`);

      try {
        const pythonScript = path.join(__dirname, "scripts", "transcribe_audio.py");
        const pythonCmd = getPythonCommand();
        
        // Build command with parameters
        let command = `${pythonCmd} "${pythonScript}" "${uploadedFilePath}" "${modelSize}"`;
        if (language) {
          command += ` "${language}"`;
        } else {
          command += ` "None"`;
        }
        command += ` "${device}"`;

        console.log(`[API] Calling Python script for transcription...`);
        const { stdout, stderr } = await execAsync(command);

        if (stderr) {
          console.error(`[API] Python stderr (transcription):`, stderr);
        }

        const result = JSON.parse(stdout.trim());

        if (!result.success) {
          return res.status(500).json({
            error: result.error || "Transcription failed",
            details: result.details || "Could not transcribe audio file.",
          });
        }

        const transcript = result.transcript;

        if (!transcript || transcript.length === 0) {
          return res.status(404).json({
            error: "No transcript text found",
            details: "The transcription completed but contains no text.",
          });
        }

        console.log(
          `[API] Successfully transcribed audio (${transcript.length} characters, ${result.wordCount} words, language: ${result.language})`,
        );

        res.json({
          transcript,
          wordCount: result.wordCount,
          characterCount: result.characterCount || transcript.length,
          language: result.language,
        });
      } catch (pythonError: any) {
        console.error("[API] Error calling Python script for transcription:", pythonError);

        let errorMessage = "Failed to transcribe audio";
        if (pythonError.message?.includes("No module named 'faster_whisper'")) {
          errorMessage =
            "Python 'faster-whisper' not installed. Please run 'pip install faster-whisper'.";
        } else if (pythonError.message?.includes("CUDA")) {
          errorMessage = "CUDA/GPU error. Try using device='cpu' instead.";
        }

        res.status(500).json({
          error: errorMessage,
          details: pythonError.message,
        });
      }
    } catch (error: any) {
      console.error("[API] Error in audio transcription endpoint:", error);
      res.status(500).json({ error: "Failed to transcribe audio file" });
    } finally {
      // Clean up uploaded file
      if (uploadedFilePath && existsSync(uploadedFilePath)) {
        try {
          unlinkSync(uploadedFilePath);
          console.log(`[API] Cleaned up temporary file: ${uploadedFilePath}`);
        } catch (cleanupError) {
          console.error(`[API] Error cleaning up file: ${cleanupError}`);
        }
      }
    }
  });

  /**
   * AI Summary endpoint
   * Priority:
   * 1) Gemini API (GEMINI_API_KEY) - if not GPU mode
   * 2) Qwen GPU model (via Python script) - if GPU mode
   * 3) Simple text-based fallback
   */
  app.post("/api/ai/summary", async (req: Request, res: Response) => {
    try {
      const { transcript, mode } = req.body as { transcript?: string; mode?: "gpu" | "api" };

      const isGpuMode = mode === "gpu";

      const isApiMode = mode === "api";

      if (!transcript || typeof transcript !== "string") {
        return res.status(400).json({ error: "Transcript is required" });
      }

      if (transcript.length < 100) {
        return res.status(400).json({
          error: "Transcript is too short to generate a summary",
        });
      }

      console.log(
        `[API] Generating AI summary for transcript (${transcript.length} characters)`,
      );

      // Priority 1: Gemini (Google Generative AI) - only if not forcing GPU/local-only

      const geminiApiKey = process.env.GEMINI_API_KEY;

      if (geminiApiKey && !isGpuMode) {
        try {
          console.log("[API] Using Gemini API for summary generation");

          const genAI = new GoogleGenerativeAI(geminiApiKey);

          // Use a model name that is actually available for your key (from ListModels)

          const model = genAI.getGenerativeModel({

            model: "gemini-2.5-flash",

          });

          const hasArabic = /[\u0600-\u06FF]/.test(transcript);

          const language = hasArabic ? "Arabic" : "English";

          const headingIntro = hasArabic ? "المقدمة" : "Introduction";

          const headingSummary = hasArabic ? "الملخص" : "Summary";

          const headingPoints = hasArabic ? "أهم النقاط" : "Key Points";

          const generateSection = async (sectionPrompt: string) => {

            const result = await model.generateContent(sectionPrompt);

            const response = await result.response;

            return response.text().trim();

          };

          // 1) المقدمة / Introduction

          const introPrompt = `You are an expert academic lecturer. Write ONLY the introduction section for this lecture transcript.

Requirements:

- Language: ${language}. Do NOT switch languages.

- Length: 2-4 sentences maximum.

- Style: Clear, concrete, and engaging, as if you are talking to a motivated student.

- Content: Briefly answer: What is the main topic? Why is it important? What key question or confusion will this lecture resolve?

- Tone: Confident but simple, avoid buzzwords.

- IMPORTANT: Do NOT include any headings like "${headingIntro}" in your answer, just the introduction text itself.`;

          const introText = await generateSection(

            `${introPrompt}

Lecture Transcript:

${transcript.substring(0, 12000)}`,

          );

          // 2) الملخص / Summary

          const summaryPrompt = `You are an expert academic summarizer. Write ONLY the main summary section for this lecture transcript.

Requirements:

- Language: ${language}. Do NOT switch languages.

- Length: 2-3 strong, well-structured paragraphs.

- Style: Abstract, rewrite in your own words (do NOT copy raw sentences). Use smooth transitions and clear explanations.

- Content: Capture the full story of the lecture in order. Explicitly explain:

  * What is being compared or explained?

  * What are the key concepts and definitions?

  * How do the examples and analogies clarify the difference?

  * What practical implications or use-cases does the lecture highlight?

- Goal: A reader who only sees this summary should fully understand the lecture and not feel they are missing important ideas.

- IMPORTANT: Do NOT include any headings like "${headingSummary}" in your answer, just the summary paragraphs.`;

          const summaryTextRaw = await generateSection(

            `${summaryPrompt}

Lecture Transcript:

${transcript.substring(0, 20000)}`,

          );

          // 3) أهم النقاط / Key Points

          const pointsPrompt = `You are an expert note-taker. Extract ONLY the key points from this lecture transcript.

Requirements:

- Language: ${language}. Do NOT switch languages.

- Output format: a plain text list where EACH line is ONE bullet point starting with "- ".

- Make the bullets rich and informative, not one-word labels.

- Try to group related ideas by starting some bullets with bold-style labels, for example:

  - **تشبيه أساسي:** ...

  - **ما هو الـ LLM؟:** ...

  - **قصور الـ LLM:** ...

  - **ما هو الـ AI Agent؟:** ...

  - **مثال عملي:** ...

- Focus on: the most important ideas, comparisons, definitions, concrete examples, analogies, and practical implications.

- Length: 8-16 bullet points maximum.

- IMPORTANT: Do NOT add any headings outside the list, no intros or outros, just the bullet list itself.`;

          const pointsRaw = await generateSection(

            `${pointsPrompt}

Lecture Transcript:

${transcript.substring(0, 20000)}`,

          );

          const keyPoints: string[] = pointsRaw

            .split(/\r?\n/)

            .map((line) => line.trim())

            .filter((line) => line.length > 0)

            .map((line) => line.replace(/^[-•▪·]\s*/, "").trim())

            .filter((line) => line.length > 0);

          const finalSummaryParts: string[] = [];

          if (introText) {

            finalSummaryParts.push(headingIntro);

            finalSummaryParts.push(introText.trim());

          }

          if (summaryTextRaw) {

            finalSummaryParts.push("");

            finalSummaryParts.push(headingSummary);

            finalSummaryParts.push(summaryTextRaw.trim());

          }

          if (keyPoints.length > 0) {

            finalSummaryParts.push("");

            finalSummaryParts.push(headingPoints);

            finalSummaryParts.push(

              keyPoints.map((p) => `- ${p}`).join("\n"),

            );

          }

          const finalSummary = finalSummaryParts.join("\n\n").trim();

          if (finalSummary.length > 100) {

            console.log(

              `[API] Gemini multi-section summary generated (${finalSummary.length} characters, ${keyPoints.length} key points)`,

            );

            return res.json({ summary: finalSummary });

          }

        } catch (geminiError: any) {

          console.error("[API] Gemini API error:", geminiError);

          // fall through to Qwen GPU / fallback

        }

      }

      // Priority 2: Qwen GPU (local AI model) - only if GPU mode is requested
      if (isGpuMode) {
        try {
          console.log("[API] Using Qwen GPU model for summary generation");
          
          const pythonCmd = getPythonCommand();
          const pythonScript = path.join(getScriptsDir(), "generate_summary.py");
          
          // Escape transcript for command line (handle quotes and special characters)
          const escapedTranscript = transcript.replace(/"/g, '\\"').replace(/\$/g, '\\$');
          
          const command = `${pythonCmd} "${pythonScript}" "${escapedTranscript}" "cuda"`;
          
          const { stdout, stderr } = await execAsync(command);
          
          if (stderr) {
            console.error(`[API] Python stderr (summary):`, stderr);
          }
          
          const result = JSON.parse(stdout.trim());
          
          if (result.success && result.summary) {
            const summaryText = result.summary.trim();
            
            if (summaryText.length > 100) {
              console.log(
                `[API] Qwen GPU summary generated (${summaryText.length} characters)`,
              );
              return res.json({ summary: summaryText });
            }
          } else {
            console.error("[API] Qwen GPU summary generation failed:", result.error || "Unknown error");
            // Fall through to fallback
          }
        } catch (qwenError: any) {
          console.error("[API] Qwen GPU error:", qwenError);
          // Fall through to fallback
        }
      }

      // Priority 3: Simple text-based fallback (no external AI)

      // Create a simple paragraph-based summary

      const sentences = transcript

        .split(/[.!؟\n]+/)

        .map((s: string) => s.trim())

        .filter((s: string) => s.length > 30);

      // Group sentences into paragraphs (3-4 sentences per paragraph)

      const sentencesPerParagraph = 3;

      const paragraphs: string[] = [];

      for (let i = 0; i < Math.min(12, sentences.length); i += sentencesPerParagraph) {

        const paragraphSentences = sentences.slice(i, i + sentencesPerParagraph);

        paragraphs.push(paragraphSentences.join(". ") + ".");

      }

      const summaryText = paragraphs.join("\n\n");

      console.log(

        `[API] Simple fallback summary generated (${summaryText.length} characters)`,

      );

      return res.json({ summary: summaryText });

    } catch (error: any) {

      console.error("[API] Error generating summary:", error);

      res.status(500).json({ error: "Failed to generate summary" });

    }

  });

  /**
   * Quiz generation endpoint using Gemini API
   * POST /api/ai/quiz
   * Body: { "transcript": "..." }
   * Returns: { "questions": [{ "id": 1, "text": "...", "options": ["...", "..."], "correctIndex": 0, "type": "multiple-choice" }] }
   */
  app.post("/api/ai/quiz", async (req: Request, res: Response) => {
    try {
      const { transcript, mode } = req.body as { transcript?: string; mode?: "gpu" | "api" };

      const isGpuMode = mode === "gpu";

      if (!transcript || typeof transcript !== "string" || transcript.trim().length < 200) {
        return res.status(400).json({
          error: "Transcript is too short to generate quiz questions (minimum 200 characters)",
        });
      }

      console.log(`[API] Generating quiz questions for transcript (${transcript.length} characters)`);

      // Priority 1: Gemini API (skip if GPU mode is requested)

      const geminiApiKey = process.env.GEMINI_API_KEY;

      if (geminiApiKey && !isGpuMode) {
        try {
          console.log("[API] Using Gemini API for quiz generation");
          const genAI = new GoogleGenerativeAI(geminiApiKey);
          const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

          const hasArabic = /[\u0600-\u06FF]/.test(transcript);
          const language = hasArabic ? "Arabic" : "English";

          const prompt = hasArabic
            ? `أنت خبير في إنشاء الاختبارات التعليمية. قم بإنشاء 5-10 أسئلة اختيار من متعدد عالية الجودة بناءً على نص المحاضرة التالي.

المتطلبات الحرجة:
- النص بالعربية. يجب أن تكتب جميع الأسئلة والخيارات والإجابات بالعربية. لا تترجم أبداً.
- أنشئ 5-10 أسئلة تختبر فهم المفاهيم الرئيسية والحقائق المهمة والأفكار الأساسية من النص.
- كل سؤال يجب أن يحتوي على 4 خيارات بالضبط (أ، ب، ج، د).
- حدد الإجابة الصحيحة بوضوح في correctIndex (0-3).
- يجب أن تكون الأسئلة واضحة ومحددة وتختبر الفهم الفعلي والتحليل (وليس فقط الحفظ).
- الأسئلة يجب أن تغطي مختلف أجزاء المحاضرة بشكل متوازن.
- استخدم لغة واضحة ومهنية مناسبة للطلاب.
- أعد فقط JSON صالح بهذا الشكل بالضبط (بدون markdown، بدون كتل كود، بدون نص إضافي):

{
  "questions": [
    {
      "id": 1,
      "text": "نص السؤال الواضح والمحدد هنا؟",
      "options": ["الخيار أ (صحيح)", "الخيار ب", "الخيار ج", "الخيار د"],
      "correctIndex": 0,
      "type": "multiple-choice"
    }
  ]
}

نص المحاضرة:
${transcript.substring(0, 30000)}`
            : `You are an expert educational quiz generator. Create 5-10 high-quality multiple-choice quiz questions based on the following lecture transcript.

CRITICAL REQUIREMENTS:
- The transcript is in ${language}. You MUST write ALL questions, options, and answers in ${language}. Do NOT translate.
- Generate 5-10 questions that test understanding of key concepts, important facts, and main ideas from the transcript.
- Each question must have exactly 4 options (A, B, C, D).
- Mark the correct answer clearly in correctIndex (0-3).
- Questions should be clear, specific, and test actual understanding and analysis (not just memorization).
- Questions should cover different parts of the lecture in a balanced way.
- Use clear, professional language appropriate for students.
- Return ONLY valid JSON in this exact format (no markdown, no code blocks, no extra text):

{
  "questions": [
    {
      "id": 1,
      "text": "Clear and specific question text here?",
      "options": ["Option A (correct)", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "type": "multiple-choice"
    }
  ]
}

Transcript:
${transcript.substring(0, 30000)}`;

          const result = await model.generateContent(prompt);
          const response = await result.response;
          const aiResponse: string = response.text().trim();

          if (aiResponse) {
            // Parse JSON from response (remove markdown code blocks if present)
            let parsedResponse: { questions?: any[] };
            try {
              const cleanedResponse = aiResponse
                .replace(/```json\n?/g, "")
                .replace(/```\n?/g, "")
                .trim();
              parsedResponse = JSON.parse(cleanedResponse);
            } catch (parseError) {
              console.warn("[API] Failed to parse JSON from Gemini quiz response");
              // Try to extract questions manually if JSON parsing fails
              parsedResponse = { questions: [] };
            }

            if (parsedResponse.questions && Array.isArray(parsedResponse.questions) && parsedResponse.questions.length > 0) {
              // Validate and format questions
              const validQuestions = parsedResponse.questions
                .filter((q: any) => q.text && q.options && Array.isArray(q.options) && q.options.length >= 2 && typeof q.correctIndex === "number")
                .map((q: any, index: number) => ({
                  id: index + 1,
                  text: q.text.trim(),
                  options: q.options.slice(0, 4).map((opt: string) => opt.trim()), // Ensure max 4 options
                  correctIndex: Math.min(q.correctIndex, q.options.length - 1), // Ensure valid index
                  type: q.type || "multiple-choice",
                }));

              if (validQuestions.length > 0) {
                console.log(`[API] Gemini quiz generated with ${validQuestions.length} questions`);
                return res.json({ questions: validQuestions });
              }
            }
          }
        } catch (geminiError: any) {
          console.error("[API] Gemini API error for quiz:", geminiError);
          // Fall through to Qwen GPU / fallback
        }
      }

      // Priority 2: Qwen GPU (local AI model) - only if GPU mode is requested
      if (isGpuMode) {
        try {
          console.log("[API] Using Qwen GPU model for quiz generation");
          
          const pythonCmd = getPythonCommand();
          const pythonScript = path.join(getScriptsDir(), "generate_quiz.py");
          
          // Escape transcript for command line (handle quotes and special characters)
          const escapedTranscript = transcript.replace(/"/g, '\\"').replace(/\$/g, '\\$');
          
          const command = `${pythonCmd} "${pythonScript}" "${escapedTranscript}" "cuda"`;
          
          const { stdout, stderr } = await execAsync(command);
          
          if (stderr) {
            console.error(`[API] Python stderr (quiz):`, stderr);
          }
          
          const result = JSON.parse(stdout.trim());
          
          if (result.success && result.questions && Array.isArray(result.questions) && result.questions.length > 0) {
            // Validate and format questions
            const validQuestions = result.questions
              .filter((q: any) => q.text && q.options && Array.isArray(q.options) && q.options.length >= 2 && typeof q.correctIndex === "number")
              .map((q: any, index: number) => ({
                id: index + 1,
                text: q.text.trim(),
                options: q.options.slice(0, 4).map((opt: string) => opt.trim()), // Ensure max 4 options
                correctIndex: Math.min(q.correctIndex, q.options.length - 1), // Ensure valid index
                type: q.type || "multiple-choice",
              }));

            if (validQuestions.length > 0) {
              console.log(`[API] Qwen GPU quiz generated with ${validQuestions.length} questions`);
              return res.json({ questions: validQuestions });
            }
          } else {
            console.error("[API] Qwen GPU quiz generation failed:", result.error || "Unknown error");
            // Fall through to fallback
          }
        } catch (qwenError: any) {
          console.error("[API] Qwen GPU error for quiz:", qwenError);
          // Fall through to fallback
        }
      }

      // Fallback: Simple quiz generation
      console.log("[API] Using fallback quiz generation");
      const sentences = transcript
        .split(/[.!؟\n]+/)
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 30 && s.length < 200);

      const questions: any[] = [];
      if (sentences.length > 0) {
        const hasArabic = /[\u0600-\u06FF]/.test(transcript);
        const lang = hasArabic ? "ar" : "en";

        questions.push({
          id: 1,
          text: lang === "ar" ? "ما هو الموضوع الرئيسي الذي تمت مناقشته في هذه المحاضرة؟" : "What is the main topic discussed in this lecture?",
          options: lang === "ar"
            ? ["الموضوع موضح بوضوح في النص", "تم تغطية مواضيع متعددة", "الموضوع يحتاج إلى تحليل إضافي", "الموضوع غير محدد"]
            : ["The topic is clearly explained in the transcript", "Multiple topics are covered", "The topic requires further analysis", "The topic is not specified"],
          correctIndex: 0,
          type: "multiple-choice",
        });

        if (sentences.length > 2) {
          questions.push({
            id: 2,
            text: lang === "ar" ? "تحتوي المحاضرة على شرح مفصل للمفاهيم." : "The lecture contains detailed explanations of the concepts.",
            options: lang === "ar" ? ["صحيح", "خطأ"] : ["True", "False"],
            correctIndex: 0,
            type: "true-false",
          });
        }
      }

      return res.json({ questions });
    } catch (error: any) {
      console.error("[API] Error generating quiz:", error);
      res.status(500).json({ error: "Failed to generate quiz questions" });
    }
  });

  /**
   * Flashcard generation endpoint
   * POST /api/ai/flashcards
   * Body: { "transcript": "...", "mode": "gpu" | "api" }
   * Returns: { "flashcards": [{ "id": 1, "term": "...", "definition": "..." }] }
   */
  app.post("/api/ai/flashcards", async (req: Request, res: Response) => {
    try {
      const { transcript, mode } = req.body as { transcript?: string; mode?: "gpu" | "api" };

      const isGpuMode = mode === "gpu";

      if (!transcript || typeof transcript !== "string" || transcript.trim().length < 200) {
        return res.status(400).json({
          error: "Transcript is too short to generate flashcards (minimum 200 characters)",
        });
      }

      console.log(`[API] Generating flashcards for transcript (${transcript.length} characters)`);

      // Priority 1: Gemini API (skip if GPU mode is requested)
      const geminiApiKey = process.env.GEMINI_API_KEY;

      if (geminiApiKey && !isGpuMode) {
        try {
          console.log("[API] Using Gemini API for flashcard generation");
          const genAI = new GoogleGenerativeAI(geminiApiKey);
          const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

          const hasArabic = /[\u0600-\u06FF]/.test(transcript);
          const language = hasArabic ? "Arabic" : "English";

          const prompt = hasArabic
            ? `أنت خبير في إنشاء البطاقات التعليمية. قم بإنشاء 8-15 بطاقة تعليمية عالية الجودة بناءً على نص المحاضرة التالي.

المتطلبات الحرجة:
- النص بالعربية. يجب أن تكتب جميع المصطلحات والتعريفات بالعربية. لا تترجم أبداً.
- أنشئ 8-15 بطاقة تعليمية تغطي أهم المصطلحات والمفاهيم والأفكار الرئيسية من النص.
- كل بطاقة يجب أن تحتوي على:
  * مصطلح أو مفهوم واضح ومحدد (Term) - يجب أن يكون قصيراً وواضحاً
  * تعريف أو شرح مفصل ومفيد (Definition) - يجب أن يكون شاملاً وواضحاً
- ركز على:
  * المصطلحات التقنية والمفاهيم الأساسية
  * التعريفات المهمة والأفكار الرئيسية
  * المفاهيم التي تحتاج إلى حفظ أو فهم عميق
- التعريفات يجب أن تكون:
  * واضحة ومفهومة للطلاب
  * شاملة وتغطي الجوانب المهمة
  * مفيدة للمراجعة والدراسة
- استخدم لغة مهنية وواضحة.
- أعد فقط JSON صالح بهذا الشكل بالضبط (بدون markdown، بدون كتل كود، بدون نص إضافي):

{
  "flashcards": [
    {
      "id": 1,
      "term": "المصطلح أو المفهوم الواضح",
      "definition": "التعريف أو الشرح المفصل والشامل الذي يساعد الطلاب على الفهم"
    }
  ]
}

نص المحاضرة:
${transcript.substring(0, 30000)}`
            : `You are an expert flashcard creator. Create 8-15 high-quality flashcards based on the following lecture transcript.

CRITICAL REQUIREMENTS:
- The transcript is in ${language}. You MUST write ALL terms and definitions in ${language}. Do NOT translate.
- Generate 8-15 flashcards covering the most important terms, concepts, and key ideas from the transcript.
- Each flashcard must contain:
  * A clear and specific term or concept (Term) - should be short and clear
  * A detailed and useful definition or explanation (Definition) - should be comprehensive and clear
- Focus on:
  * Technical terms and fundamental concepts
  * Important definitions and key ideas
  * Concepts that need memorization or deep understanding
- Definitions should be:
  * Clear and understandable for students
  * Comprehensive and cover important aspects
  * Useful for review and study
- Use clear, professional language.
- Return ONLY valid JSON in this exact format (no markdown, no code blocks, no extra text):

{
  "flashcards": [
    {
      "id": 1,
      "term": "Clear Term or Concept",
      "definition": "Detailed and comprehensive definition or explanation that helps students understand"
    }
  ]
}

Transcript:
${transcript.substring(0, 30000)}`;

          const result = await model.generateContent(prompt);
          const response = await result.response;
          const aiResponse: string = response.text().trim();

          if (aiResponse) {
            // Parse JSON from response (remove markdown code blocks if present)
            let parsedResponse: { flashcards?: any[] };
            try {
              const cleanedResponse = aiResponse
                .replace(/```json\n?/g, "")
                .replace(/```\n?/g, "")
                .trim();
              parsedResponse = JSON.parse(cleanedResponse);
            } catch (parseError) {
              console.warn("[API] Failed to parse JSON from Gemini flashcard response");
              parsedResponse = { flashcards: [] };
            }

            if (parsedResponse.flashcards && Array.isArray(parsedResponse.flashcards) && parsedResponse.flashcards.length > 0) {
              // Validate and format flashcards
              const validFlashcards = parsedResponse.flashcards
                .filter((f: any) => f.term && f.definition)
                .map((f: any, index: number) => ({
                  id: index + 1,
                  term: f.term.trim(),
                  definition: f.definition.trim(),
                }));

              if (validFlashcards.length > 0) {
                console.log(`[API] Gemini flashcards generated with ${validFlashcards.length} cards`);
                return res.json({ flashcards: validFlashcards });
              }
            }
          }
        } catch (geminiError: any) {
          console.error("[API] Gemini API error for flashcards:", geminiError);
          // Fall through to Qwen GPU / fallback
        }
      }

      // Priority 2: Qwen GPU (local AI model) - only if GPU mode is requested
      if (isGpuMode) {
        try {
          console.log("[API] Using Qwen GPU model for flashcard generation");
          
          const pythonCmd = getPythonCommand();
          const pythonScript = path.join(getScriptsDir(), "generate_flashcards.py");
          
          // Escape transcript for command line (handle quotes and special characters)
          const escapedTranscript = transcript.replace(/"/g, '\\"').replace(/\$/g, '\\$');
          
          const command = `${pythonCmd} "${pythonScript}" "${escapedTranscript}" "cuda"`;
          
          const { stdout, stderr } = await execAsync(command);
          
          if (stderr) {
            console.error(`[API] Python stderr (flashcards):`, stderr);
          }
          
          const result = JSON.parse(stdout.trim());
          
          if (result.success && result.flashcards && Array.isArray(result.flashcards) && result.flashcards.length > 0) {
            // Validate and format flashcards
            const validFlashcards = result.flashcards
              .filter((f: any) => f.term && f.definition)
              .map((f: any, index: number) => ({
                id: index + 1,
                term: f.term.trim(),
                definition: f.definition.trim(),
              }));

            if (validFlashcards.length > 0) {
              console.log(`[API] Qwen GPU flashcards generated with ${validFlashcards.length} cards`);
              return res.json({ flashcards: validFlashcards });
            }
          } else {
            console.error("[API] Qwen GPU flashcard generation failed:", result.error || "Unknown error");
            // Fall through to fallback
          }
        } catch (qwenError: any) {
          console.error("[API] Qwen GPU error for flashcards:", qwenError);
          // Fall through to fallback
        }
      }

      // Fallback: Simple flashcard generation
      console.log("[API] Using fallback flashcard generation");
      const sentences = transcript
        .split(/[.!؟\n]+/)
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 20 && s.length < 150);

      const flashcards: any[] = [];
      if (sentences.length > 0) {
        const hasArabic = /[\u0600-\u06FF]/.test(transcript);
        const lang = hasArabic ? "ar" : "en";

        // Extract first few sentences as simple flashcards
        sentences.slice(0, Math.min(5, sentences.length)).forEach((sentence, idx) => {
          const words = sentence.split(/\s+/);
          if (words.length > 3) {
            const term = words.slice(0, 3).join(" ");
            const definition = sentence;
            flashcards.push({
              id: idx + 1,
              term: term,
              definition: definition,
            });
          }
        });
      }

      return res.json({ flashcards });
    } catch (error: any) {
      console.error("[API] Error generating flashcards:", error);
      res.status(500).json({ error: "Failed to generate flashcards" });
    }
  });

  /**
   * Text summarization endpoint using Gemini API
   * POST /api/summarize
   * Body: { "text": "some long text here..." }
   * Returns: { "summary": "...", "keyPoints": ["...", "..."] }
   */
  app.post("/api/summarize", async (req: Request, res: Response) => {
    try {
      const { text } = req.body;

      if (!text || typeof text !== "string" || text.trim().length === 0) {
        return res.status(400).json({ error: "Text is required and must be a non-empty string" });
      }

      const geminiApiKey = process.env.GEMINI_API_KEY;
      if (!geminiApiKey) {
        return res.status(500).json({ error: "Gemini API key is not configured" });
      }

      // Detect language
      const hasArabic = /[\u0600-\u06FF]/.test(text);
      const language = hasArabic ? "عربي" : "إنجليزي";

      const prompt = `أنت مساعد تلخيص نصوص.

المطلوب:
- لخص النص التالي في فقرة أو فقرتين.
- استخرج أهم النقاط على شكل قائمة نقاط.

الشروط:
- استخدم نفس لغة النص (إذا كان عربي، خلك بالعربي؛ إذا إنجليزي، خلك بالإنجليزي).
- ارجع النتيجة بصيغة JSON فقط بهذا الشكل:
{
  "summary": "...",
  "key_points": ["...", "...", "..."]
}

النص:
${text}`;

      const genAI = new GoogleGenerativeAI(geminiApiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const aiResponse = response.text().trim();

      // Parse JSON from response (may contain markdown code blocks)
      let parsedResponse: { summary?: string; key_points?: string[] };
      try {
        // Remove markdown code blocks if present
        const cleanedResponse = aiResponse
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();
        parsedResponse = JSON.parse(cleanedResponse);
      } catch (parseError) {
        // If JSON parsing fails, try to extract summary and points manually
        console.warn("[API] Failed to parse JSON from Gemini response, attempting fallback extraction");
        
        // Try to extract summary (text before "key_points" or list)
        const summaryMatch = aiResponse.match(/"summary"\s*:\s*"([^"]+)"/);
        const keyPointsMatch = aiResponse.match(/"key_points"\s*:\s*\[([\s\S]*?)\]/);
        
        parsedResponse = {
          summary: summaryMatch ? summaryMatch[1] : aiResponse.split("\n")[0] || "Summary extraction failed",
          key_points: keyPointsMatch
            ? keyPointsMatch[1]
                .split(",")
                .map((p) => p.trim().replace(/^"|"$/g, ""))
                .filter((p) => p.length > 0)
            : [],
        };
      }

      // Validate and format response
      if (!parsedResponse.summary || !parsedResponse.key_points || !Array.isArray(parsedResponse.key_points)) {
        return res.status(500).json({
          error: "Invalid response format from Gemini API",
          rawResponse: aiResponse,
        });
      }

      return res.json({
        summary: parsedResponse.summary,
        keyPoints: parsedResponse.key_points,
      });
    } catch (error: any) {
      console.error("[API] Error in /api/summarize:", error);
      
      // Handle specific Gemini API errors
      if (error.status === 429) {
        return res.status(429).json({
          error: "Rate limit exceeded. Please try again later.",
        });
      }
      
      if (error.status === 401 || error.status === 403) {
        return res.status(401).json({
          error: "Invalid or unauthorized API key",
        });
      }

      return res.status(500).json({
        error: "Failed to generate summary",
        details: error.message,
      });
    }
  });

  /**
   * AI Slides generation endpoint
   * POST /api/ai/slides
   * Body: { transcript, summary?, theme? }
   * Returns: { lectureTitle, language, theme, slides: [{ title, bullets, notes? }] }
   */
  app.post("/api/ai/slides", async (req: Request, res: Response) => {
    try {
      const { transcript, summary, theme = "clean" } = req.body as {
        transcript?: string;
        summary?: string | string[];
        theme?: "clean" | "dark" | "academic" | "vibrant";
      };

      if (!transcript || typeof transcript !== "string") {
        return res.status(400).json({ error: "Transcript is required" });
      }

      const geminiApiKey = process.env.GEMINI_API_KEY;
      if (!geminiApiKey) {
        return res.status(500).json({ error: "Gemini API key is not configured" });
      }

      const hasArabic = /[\u0600-\u06FF]/.test(transcript);
      const language = hasArabic ? "Arabic" : "English";

      const genAI = new GoogleGenerativeAI(geminiApiKey);
      
      // Use gemini-2.5-flash (most reliable and widely available)
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: {
          temperature: 0.3,
          topP: 0.9,
          maxOutputTokens: 4096,
        },
      });
      
      console.log(`[API] Using Gemini model: gemini-2.5-flash for ${language} language`);

      const prompt = language === "Arabic" 
        ? `أنت مصمم عروض تقديمية خبير متخصص في المحتوى التعليمي العربي. قم بإنشاء مجموعة شرائح احترافية ومنظمة من نص المحاضرة هذا.

المتطلبات الأساسية:
- اللغة: العربية فقط. اكتب كل شيء بالعربية الفصحى أو العامية حسب نص المحاضرة.
- تنسيق المخرجات: JSON صالح فقط (بدون markdown، بدون كتل كود، بدون شرح إضافي).
- الهيكل: 8-14 شريحة إجمالاً.
- الشريحة الأولى: شريحة العنوان الرئيسي مع موضوع المحاضرة (يجب أن يكون عنواناً واضحاً وليس فارغاً).
- الشريحة الأخيرة: ملخص شامل أو النقاط الرئيسية.
- الشرائح الوسطى: محتوى منظم منطقياً يغطي الموضوع.

تنسيق JSON المطلوب (يجب أن يكون صالحاً تماماً):
{
  "lectureTitle": "عنوان المحاضرة الكامل",
  "slides": [
    {
      "title": "عنوان الشريحة الواضح والوصفي",
      "bullets": ["نقطة رئيسية أولى", "نقطة رئيسية ثانية", "نقطة رئيسية ثالثة"],
      "notes": "ملاحظات اختيارية"
    }
  ]
}

الإرشادات المهمة جداً:
1. كل شريحة يجب أن تحتوي على عنوان واضح ومميز وليس فارغاً أبداً.
2. العناوين يجب أن تكون وصفية وتعبر عن محتوى الشريحة بوضوح.
3. كل شريحة يجب أن تحتوي على 3-6 نقاط رئيسية كحد أقصى.
4. النقاط يجب أن تكون مختصرة ولكنها مفيدة وغنية بالمعلومات.
5. استخدم لغة تعليمية واضحة ومفهومة.
6. نظم المحتوى منطقياً: مقدمة → المفاهيم الرئيسية → تفاصيل → أمثلة → تطبيقات → خاتمة.
7. تأكد من أن كل شريحة لها عنوان واضح وليس "شريحة 1" أو "عنوان" فقط.
8. استخدم عناوين وصفية مثل "مقدمة في الموضوع" أو "المفاهيم الأساسية" أو "التطبيقات العملية".
9. لا تترك أي شريحة بدون عنوان أو بدون نقاط.

نص المحاضرة:
${transcript.substring(0, 30000)}`
        : `You are an expert presentation designer. Create a structured slide deck from this lecture transcript.

Requirements:
- Language: English. Write EVERYTHING in English.
- Output format: Valid JSON only (no markdown, no code blocks).
- Structure: 8-14 slides total.
- First slide: Title slide with lecture topic.
- Last slide: Summary/Key Takeaways.
- Middle slides: Content organized logically.

JSON Format:
{
  "lectureTitle": "Title of the lecture",
  "slides": [
    {
      "title": "Slide title",
      "bullets": ["bullet point 1", "bullet point 2", "..."],
      "notes": "optional speaker notes"
    }
  ]
}

Guidelines:
- Each slide MUST have a clear and descriptive title.
- Each slide should have 3-6 bullet points maximum.
- Bullets should be concise but informative.
- Use clear, educational language.
- Organize content logically (introduction → main concepts → examples → conclusion).
- Ensure every slide has a meaningful title, never leave titles empty.

Lecture Transcript:
${transcript.substring(0, 30000)}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const aiResponseRaw = response.text().trim();

      console.log("[API] Raw AI response length:", aiResponseRaw.length);
      console.log("[API] Raw AI response preview:", aiResponseRaw.substring(0, 200));

      // Clean markdown if present
      let cleanedResponse = aiResponseRaw
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

      // Try to extract JSON if it's embedded in text
      const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanedResponse = jsonMatch[0];
      }

      // Try to fix common JSON issues
      // Fix unclosed strings by finding the last complete object
      let fixedResponse = cleanedResponse;
      try {
        // Try to find the last complete slide object
        const slidesMatch = fixedResponse.match(/"slides"\s*:\s*\[([\s\S]*)\]/);
        if (slidesMatch) {
          const slidesContent = slidesMatch[1];
          // Count opening and closing braces to find where JSON might be incomplete
          let braceCount = 0;
          let lastValidPos = 0;
          for (let i = 0; i < slidesContent.length; i++) {
            if (slidesContent[i] === '{') braceCount++;
            if (slidesContent[i] === '}') {
              braceCount--;
              if (braceCount === 0) {
                lastValidPos = i + 1;
              }
            }
          }
          // If we have incomplete JSON, try to close it
          if (braceCount > 0) {
            // Find the last complete slide and close the array
            const lastCompleteSlide = slidesContent.lastIndexOf('}');
            if (lastCompleteSlide > 0) {
              fixedResponse = fixedResponse.substring(0, fixedResponse.indexOf('"slides"') + 8) + 
                '[' + slidesContent.substring(0, lastCompleteSlide + 1) + ']';
            }
          }
        }
      } catch (fixError) {
        console.warn("[API] Error fixing JSON, will try original:", fixError);
      }

      let parsedResponse: {
        lectureTitle?: string;
        slides?: { title?: string; bullets?: string[]; notes?: string }[];
      };

      try {
        parsedResponse = JSON.parse(fixedResponse);
      } catch (parseError: any) {
        console.warn("[API] Failed to parse slides JSON:", parseError);
        console.warn("[API] Parse error position:", parseError.message);
        
        // Try to extract partial data using regex
        try {
          const partialSlides: any[] = [];
          
          // Extract lecture title
          const titleMatch = cleanedResponse.match(/"lectureTitle"\s*:\s*"([^"]+)"/);
          const lectureTitle = titleMatch ? titleMatch[1] : (language === "Arabic" ? "شرائح المحاضرة" : "Lecture Slides");
          
          // Extract slides - find all slide objects, handling incomplete ones
          // Pattern to match slide objects, even if incomplete
          const slidePattern = /\{\s*"title"\s*:\s*"((?:[^"\\]|\\.)*)"\s*,\s*"bullets"\s*:\s*\[([^\]]*)\]/g;
          let slideMatch;
          
          while ((slideMatch = slidePattern.exec(cleanedResponse)) !== null) {
            const title = slideMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
            const bulletsStr = slideMatch[2];
            
            // Parse bullets - handle both complete and incomplete arrays
            const bullets: string[] = [];
            if (bulletsStr.trim().length > 0) {
              // Try to extract bullet strings
              const bulletPattern = /"((?:[^"\\]|\\.)*)"/g;
              let bulletMatch;
              while ((bulletMatch = bulletPattern.exec(bulletsStr)) !== null) {
                bullets.push(bulletMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\'));
              }
            }
            
            if (title && title.length > 0) {
              partialSlides.push({
                title,
                bullets: bullets.length > 0 ? bullets : (language === "Arabic" ? ["محتوى الشريحة"] : ["Slide content"]),
                notes: "",
              });
            }
          }
          
          // If regex didn't work, try a simpler approach - find all titles
          if (partialSlides.length === 0) {
            const titlePattern = /"title"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
            let titleMatch;
            while ((titleMatch = titlePattern.exec(cleanedResponse)) !== null) {
              const title = titleMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
              if (title && title.length > 0 && !title.includes('lectureTitle')) {
                partialSlides.push({
                  title,
                  bullets: [language === "Arabic" ? "محتوى الشريحة" : "Slide content"],
                  notes: "",
                });
              }
            }
          }
          
          if (partialSlides.length > 0) {
            parsedResponse = {
              lectureTitle,
              slides: partialSlides,
            };
            console.log(`[API] Successfully extracted ${partialSlides.length} slides from partial JSON`);
          } else {
            throw new Error("Could not extract any slides from response");
          }
        } catch (extractError: any) {
          console.error("[API] Failed to extract partial data:", extractError);
          return res.status(500).json({
            error: "Failed to parse AI response",
            details: parseError.message,
            rawResponse: cleanedResponse.substring(0, 2000),
            suggestion: "The AI response may be incomplete. Please try again or check your API key limits.",
          });
        }
      }

      if (!parsedResponse.slides || !Array.isArray(parsedResponse.slides)) {
        return res.status(500).json({
          error: "Invalid slides format from AI",
          rawResponse: cleanedResponse.substring(0, 500),
        });
      }

      // Validate and clean slides
      const validatedSlides = parsedResponse.slides
        .map((s, idx) => {
          const title = s.title?.trim() || (language === "Arabic" ? `شريحة ${idx + 1}` : `Slide ${idx + 1}`);
          const bullets = Array.isArray(s.bullets) ? s.bullets.filter(b => b && b.trim().length > 0) : [];
          
          // Ensure each slide has at least a title
          if (!title || title.length === 0) {
            return {
              title: language === "Arabic" ? `شريحة ${idx + 1}` : `Slide ${idx + 1}`,
              bullets: bullets.length > 0 ? bullets : (language === "Arabic" ? ["محتوى الشريحة"] : ["Slide content"]),
              notes: s.notes || "",
            };
          }
          
          return {
            title,
            bullets: bullets.length > 0 ? bullets : (language === "Arabic" ? ["محتوى الشريحة"] : ["Slide content"]),
            notes: s.notes || "",
          };
        })
        .filter(s => s.title && s.title.length > 0); // Remove slides without titles

      console.log(`[API] Generated ${validatedSlides.length} slides for ${language} language`);
      
      return res.json({
        lectureTitle: parsedResponse.lectureTitle || (language === "Arabic" ? "شرائح المحاضرة" : "Lecture Slides"),
        language,
        theme,
        slides: validatedSlides,
      });
    } catch (error: any) {
      console.error("[API] Error generating slides:", error);
      console.error("[API] Error details:", {
        message: error.message,
        name: error.name,
        stack: error.stack?.substring(0, 500),
      });
      
      // Check if it's a network/API error
      if (error.message?.includes("fetch failed") || error.message?.includes("network")) {
        return res.status(503).json({
          error: "Network error connecting to AI service",
          details: "Please check your internet connection and API key",
        });
      }
      
      return res.status(500).json({
        error: "Failed to generate slides",
        details: error.message || "Unknown error occurred",
      });
    }
  });

  /**
   * Download slides as PowerPoint (.pptx)
   * POST /api/ai/slides/download
   * Body: { transcript, summary?, theme?, lectureTitle? }
   * Returns: PPTX file download
   */
  app.post("/api/ai/slides/download", async (req: Request, res: Response) => {
    try {
      const { slides: providedSlides, theme = "clean", lectureTitle = "Lecture Slides", customColor } = req.body as {
        slides?: { title: string; content: string[] }[];
        theme?: "clean" | "dark" | "academic" | "modern" | "tech";
        lectureTitle?: string;
        customColor?: string;
      };

      // Use provided slides if available, otherwise return error
      if (!providedSlides || !Array.isArray(providedSlides) || providedSlides.length === 0) {
        return res.status(400).json({ error: "Slides are required" });
      }

      // Detect language from first slide
      const firstSlideText = providedSlides[0]?.title || "";
      const hasArabic = /[\u0600-\u06FF]/.test(firstSlideText);
      const language = hasArabic ? "Arabic" : "English";

      const slides = providedSlides.map((s) => ({
        title: s.title || "Untitled Slide",
        bullets: s.content || [],
        notes: "",
      }));

      // Create PowerPoint
      const pptx = new pptxgen();
      
      // Validate pptxgen instance
      if (!pptx) {
        throw new Error("Failed to initialize PowerPoint generator");
      }

      // Theme configuration - using site colors with fonts
      // Primary: hsl(250 84% 65%) = #8B5CF6
      // pptxgenjs expects hex colors without # prefix
      const themes = {
        clean: {
          backgroundColor: "FFFFFF",
          titleColor: "8B5CF6", // Purple
          textColor: "0A0A0B", // Site foreground
          accentColor: "7C3AED", // Darker violet
          borderColor: "E4E4E7", // Site border
          font: "Arial",
        },
        dark: {
          backgroundColor: "1F2937",
          titleColor: "10B981", // Green
          textColor: "F9FAFB",
          accentColor: "059669", // Darker green
          borderColor: "374151",
          font: "Roboto",
        },
        academic: {
          backgroundColor: "F5F5F7", // Site background
          titleColor: "2563EB", // Blue
          textColor: "0A0A0B", // Site foreground
          accentColor: "1D4ED8", // Darker blue
          borderColor: "E4E4E7", // Site border
          font: "Times New Roman",
        },
        modern: {
          backgroundColor: "8B5CF6", // Gradient-like primary
          titleColor: "FFFFFF", // White on primary
          textColor: "FFFFFF",
          accentColor: "EC4899", // Pink
          borderColor: "7C3AED",
          font: "Montserrat",
        },
        tech: {
          backgroundColor: "1E1B4B", // Dark purple-blue
          titleColor: "06B6D4", // Cyan
          textColor: "E2E8F0", // Light slate
          accentColor: "0891B2", // Darker cyan
          borderColor: "4C1D95",
          font: "Consolas",
        },
      };

      let selectedTheme = themes[theme] || themes.clean;

      // Apply custom color if provided (convert hex to RGB without #)
      let finalTitleColor = selectedTheme.titleColor;
      let finalAccentColor = selectedTheme.accentColor;
      let finalBackgroundColor = selectedTheme.backgroundColor;
      
      // Ensure colors don't have # prefix
      finalTitleColor = finalTitleColor.startsWith("#") ? finalTitleColor.substring(1).toUpperCase() : finalTitleColor.toUpperCase();
      finalAccentColor = finalAccentColor.startsWith("#") ? finalAccentColor.substring(1).toUpperCase() : finalAccentColor.toUpperCase();
      finalBackgroundColor = finalBackgroundColor.startsWith("#") ? finalBackgroundColor.substring(1).toUpperCase() : finalBackgroundColor.toUpperCase();
      
      if (customColor) {
        const hexColor = customColor.replace("#", "").toUpperCase();
        const r = parseInt(hexColor.substring(0, 2), 16);
        const g = parseInt(hexColor.substring(2, 4), 16);
        const b = parseInt(hexColor.substring(4, 6), 16);
        
        // Calculate darker variant for accent
        const darkerR = Math.max(0, r - 30);
        const darkerG = Math.max(0, g - 30);
        const darkerB = Math.max(0, b - 30);
        const darkerHex = `${darkerR.toString(16).padStart(2, "0")}${darkerG.toString(16).padStart(2, "0")}${darkerB.toString(16).padStart(2, "0")}`.toUpperCase();

        // Override colors with custom color
        finalTitleColor = hexColor;
        finalAccentColor = darkerHex;
      }

      // Normalize all theme colors
      const finalTextColor = selectedTheme.textColor.startsWith("#") 
        ? selectedTheme.textColor.substring(1).toUpperCase() 
        : selectedTheme.textColor.toUpperCase();
      const finalBorderColor = selectedTheme.borderColor.startsWith("#") 
        ? selectedTheme.borderColor.substring(1).toUpperCase() 
        : selectedTheme.borderColor.toUpperCase();

      console.log("[PPTX] Theme:", theme, "Custom Color:", customColor);
      console.log("[PPTX] Final Colors - BG:", finalBackgroundColor, "Title:", finalTitleColor, "Accent:", finalAccentColor, "Text:", finalTextColor, "Border:", finalBorderColor);

      // Set slide layout and master slide properties
      pptx.layout = "LAYOUT_WIDE";
      pptx.defineLayout({ name: "CUSTOM", width: 10, height: 7.5 });

      // Add slides with improved design
      slides.forEach((slide: { title: string; bullets: string[] }, idx: number) => {
        const pptxSlide = pptx.addSlide();

        // Background - apply theme background color
        pptxSlide.background = { color: finalBackgroundColor };

        // Add a subtle header bar with primary color
        try {
          pptxSlide.addShape(pptx.ShapeType.rect as any, {
            x: 0,
            y: 0,
            w: 10,
            h: 0.3,
            fill: { color: finalTitleColor },
            line: { color: finalTitleColor, width: 0 },
          });
        } catch (shapeError: any) {
          console.warn("[API] Shape error (continuing):", shapeError.message);
          // Continue without header bar
        }

        // Title with better positioning and styling
        // For Arabic, use fonts that support Arabic (Arial, Times New Roman, etc.)
        const titleFont = language === "Arabic" 
          ? (selectedTheme.font === "Consolas" || selectedTheme.font === "Montserrat" 
              ? "Arial" 
              : selectedTheme.font)
          : selectedTheme.font;
        
        const titleOptions: any = {
          x: 0.5,
          y: 0.8,
          w: 9,
          h: 0.9,
          fontSize: 36,
          bold: true,
          color: finalTitleColor,
          align: language === "Arabic" ? "right" : "left",
          valign: "top",
          ...(titleFont && { fontFace: titleFont }),
        };
        
        // Add RTL support for Arabic if available
        if (language === "Arabic") {
          titleOptions.rtlMode = true;
        }
        
        pptxSlide.addText(slide.title, titleOptions);

        // Add a subtle divider line
        try {
          pptxSlide.addShape(pptx.ShapeType.line as any, {
            x: 0.5,
            y: 1.7,
            w: 9,
            h: 0,
            line: { color: finalBorderColor, width: 2 },
          });
        } catch (lineError: any) {
          console.warn("[API] Line error (continuing):", lineError.message);
          // Continue without divider line
        }

        // Bullets with better spacing and styling
        slide.bullets.forEach((bullet, bulletIdx) => {
          const yPos = 2.0 + bulletIdx * 0.65;
          
          // Add bullet point indicator (use accent color)
          try {
            pptxSlide.addShape(pptx.ShapeType.roundRect as any, {
              x: language === "Arabic" ? 9.2 : 0.5,
              y: yPos + 0.1,
              w: 0.2,
              h: 0.2,
              fill: { color: finalAccentColor },
              line: { color: finalAccentColor, width: 0 },
            });
          } catch (bulletError: any) {
            console.warn("[API] Bullet shape error (continuing):", bulletError.message);
            // Continue without bullet indicator
          }

          // For Arabic, use fonts that support Arabic
          const bulletFont = language === "Arabic" 
            ? (selectedTheme.font === "Consolas" || selectedTheme.font === "Montserrat" 
                ? "Arial" 
                : selectedTheme.font)
            : selectedTheme.font;
          
          const bulletOptions: any = {
            x: language === "Arabic" ? 0.5 : 0.8,
            y: yPos,
            w: language === "Arabic" ? 8.5 : 8.7,
            h: 0.5,
            fontSize: 20,
            color: finalTextColor,
            align: language === "Arabic" ? "right" : "left",
            valign: "top",
            lineSpacing: 28,
            ...(bulletFont && { fontFace: bulletFont }),
          };
          
          // Add RTL support for Arabic if available
          if (language === "Arabic") {
            bulletOptions.rtlMode = true;
          }
          
          pptxSlide.addText(bullet, bulletOptions);
        });

        // Add footer with copyright on last slide
        if (idx === slides.length - 1) {
          pptxSlide.addText(
            `© 2025 Lecture Assistant. ${language === "Arabic" ? "جميع الحقوق محفوظة" : "All rights reserved"}`,
            {
              x: 0.5,
              y: 6.8,
              w: 9,
              h: 0.3,
              fontSize: 10,
              color: finalTextColor,
              align: "center",
            }
          );
        }
      });

      // Generate buffer
      let buffer: Buffer;
      try {
        const pptxBuffer = await pptx.write({ outputType: "nodebuffer" });
        // Ensure it's a Buffer
        buffer = Buffer.isBuffer(pptxBuffer) ? pptxBuffer : Buffer.from(pptxBuffer as any);
      } catch (writeError: any) {
        console.error("[API] Error writing PPTX buffer:", writeError);
        throw new Error(`Failed to write PowerPoint: ${writeError.message}`);
      }

      if (!buffer || buffer.length === 0) {
        throw new Error("Generated PowerPoint buffer is empty");
      }

      // Support Arabic in filename using RFC 5987 encoding
      const hasArabicInTitle = /[\u0600-\u06FF]/.test(lectureTitle || "");
      
      // Create safe ASCII filename for basic header
      const asciiFilename = (lectureTitle || "lecture_slides")
        .replace(/[^\x20-\x7E]/g, "") // Remove all non-ASCII characters
        .replace(/[^a-z0-9\s-]/gi, "_")
        .replace(/\s+/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "")
        .substring(0, 100) || "lecture_slides";
      
      const filename = `${asciiFilename}_slides.pptx`;
      
      // Use RFC 5987 encoding for Arabic filenames
      let contentDisposition: string;
      if (hasArabicInTitle) {
        // RFC 5987: filename*=UTF-8''encoded-filename
        const encodedFilename = encodeURIComponent(`${lectureTitle}_slides.pptx`);
        contentDisposition = `attachment; filename="${filename}"; filename*=UTF-8''${encodedFilename}`;
      } else {
        contentDisposition = `attachment; filename="${filename}"`;
      }
      
      console.log("[PPTX] Original title:", lectureTitle);
      console.log("[PPTX] Has Arabic:", hasArabicInTitle);
      console.log("[PPTX] Content-Disposition:", contentDisposition);
      
      // Send file with properly encoded filename
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.presentationml.presentation");
      res.setHeader("Content-Disposition", contentDisposition);
      res.send(buffer);
    } catch (error: any) {
      console.error("[API] Error generating PPTX:", error);
      console.error("[API] Error stack:", error.stack);
      return res.status(500).json({
        error: "Failed to generate PowerPoint file",
        details: error.message || "Unknown error occurred",
      });
    }
  });

  // use storage to perform CRUD operations on the storage interface
  // e.g. storage.insertUser(user) or storage.getUserByUsername(username)

  return httpServer;
}

 