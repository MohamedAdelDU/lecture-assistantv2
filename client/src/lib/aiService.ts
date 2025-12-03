// AI service for generating summaries, quizzes, and slides
// This is a simplified version - in production, integrate with OpenAI, Anthropic, or similar

export interface AISummary {
  points: string[];
}

export interface AIQuestion {
  id: number;
  text: string;
  options: string[];
  correctIndex: number;
  type: "multiple-choice" | "true-false";
}

export interface AISlide {
  id: number;
  title: string;
  content: string[];
  note?: string;
}

// Generate summary from transcript using AI (returns long-form abstractive summary)
export async function generateSummary(transcript: string, mode?: "gpu" | "api"): Promise<string> {
  try {
    console.log(`[aiService] Generating AI abstractive summary (mode: ${mode || "api"})...`);
    
    // Call backend API for AI summary generation
    const response = await fetch("/api/ai/summary", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ transcript, mode }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to generate summary");
    }

    // Support both string (new format) and array (old format) for backward compatibility
    if (typeof data.summary === "string") {
      console.log(`[aiService] AI abstractive summary generated (${data.summary.length} characters)`);
      return data.summary;
    } else if (Array.isArray(data.summary)) {
      // Legacy format: convert array to paragraph text
      const summaryText = data.summary.join(" ");
      console.log(`[aiService] AI summary converted from array format (${summaryText.length} characters)`);
      return summaryText;
    } else {
      throw new Error("Invalid summary format received");
    }
  } catch (error: any) {
    console.error("[aiService] Error generating summary:", error);
    
    // Fallback to simple summary if API fails
    if (!transcript || transcript.length < 100) {
      return "Transcript is too short to generate a summary.";
    }

    const sentences = transcript
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 30);

    // Group into paragraphs
    const sentencesPerParagraph = 3;
    const paragraphs: string[] = [];
    for (let i = 0; i < Math.min(9, sentences.length); i += sentencesPerParagraph) {
      const paragraphSentences = sentences.slice(i, i + sentencesPerParagraph);
      paragraphs.push(paragraphSentences.join(". ") + ".");
    }

    return paragraphs.join("\n\n");
  }
}

// Generate quiz questions from transcript using AI
export async function generateQuiz(transcript: string, mode?: "gpu" | "api"): Promise<AIQuestion[]> {
  try {
    console.log(`[aiService] Generating AI quiz questions (mode: ${mode || "api"})...`);
    
    if (!transcript || transcript.length < 200) {
      console.warn("[aiService] Transcript too short for quiz generation");
      return [];
    }

    // Call backend API for AI quiz generation
    const response = await fetch("/api/ai/quiz", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ transcript, mode }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to generate quiz questions");
    }

    if (!data.questions || !Array.isArray(data.questions)) {
      throw new Error("Invalid quiz format received");
    }

    // Map backend format to AIQuestion interface
    const questions: AIQuestion[] = data.questions.map((q: any) => ({
      id: q.id || 0,
      text: q.text || "",
      options: q.options || [],
      correctIndex: q.correctIndex ?? 0,
      type: (q.type === "true-false" ? "true-false" : "multiple-choice") as "multiple-choice" | "true-false",
    }));

    console.log(`[aiService] AI quiz generated with ${questions.length} questions`);
    return questions;
  } catch (error: any) {
    console.error("[aiService] Error generating quiz:", error);
    
    // Fallback to simple quiz if API fails
    if (!transcript || transcript.length < 200) {
      return [];
    }

    const questions: AIQuestion[] = [];
    const sentences = transcript
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 30 && s.length < 200);

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

    return questions;
  }
}

// Generate slides from transcript and summary
export async function generateSlides(
  transcript: string,
  summary: string | string[]
): Promise<AISlide[]> {
  try {
    // Use AI API to generate structured slides
    const response = await fetch("/api/ai/slides", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        transcript,
        summary,
        theme: "clean", // Default theme, user can change later
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to generate slides");
    }

    const data = await response.json();
    
    // Convert API response to AISlide format
    if (data.slides && Array.isArray(data.slides)) {
      return data.slides.map((slide: any, index: number) => ({
        id: index + 1,
        title: slide.title || `Slide ${index + 1}`,
        content: slide.bullets || slide.content || [],
      }));
    }

    // Fallback: return empty array if no slides
    return [];
  } catch (error) {
    console.error("[aiService] Error generating slides:", error);
    
    // Fallback: create simple slides from summary if API fails
    const slides: AISlide[] = [];
    
    // Handle both string (new format) and array (legacy format)
    if (typeof summary === "string") {
      if (!summary || summary.trim().length === 0) {
        return slides;
      }
      
      // Split long-form summary into paragraphs and create slides from them
      const paragraphs = summary.split(/\n\s*\n/).filter(p => p.trim().length > 0);
      
      for (let i = 0; i < paragraphs.length; i++) {
        const paragraph = paragraphs[i].trim();
        // Split paragraph into sentences for slide content
        const sentences = paragraph.split(/[.!؟]+/).filter(s => s.trim().length > 20);
        
        if (sentences.length > 0) {
          slides.push({
            id: slides.length + 1,
            title: `Section ${slides.length + 1}`,
            content: sentences.slice(0, 4), // Max 4 sentences per slide
          });
        }
      }
    } else {
      // Legacy array format
      if (summary.length === 0) {
        return slides;
      }

      // Create slides from summary points (group every 2-3 points)
      const pointsPerSlide = 2;
      for (let i = 0; i < summary.length; i += pointsPerSlide) {
        const slidePoints = summary.slice(i, i + pointsPerSlide);
        slides.push({
          id: slides.length + 1,
          title: `Key Point ${slides.length + 1}`,
          content: slidePoints,
        });
      }
    }

    return slides;
  }
}

// Generate flashcards from transcript
export async function generateFlashcards(transcript: string): Promise<any[]> {
  // Simplified flashcard generation
  // In production, extract key terms and definitions using AI
  
  return [
    {
      id: 1,
      front: "Main Concept",
      back: "The primary topic discussed in this lecture",
    },
  ];
}

// Slide theme type
export type SlideTheme = "clean" | "dark" | "academic" | "modern" | "tech";

// Download slides as PowerPoint (.pptx)
export async function downloadSlidesPptx(
  slides: { title: string; content: string[] }[],
  theme: SlideTheme = "clean",
  lectureTitle: string = "Lecture Slides",
  customColor?: string,
): Promise<void> {
  try {
    // Validate slides data
    if (!slides || !Array.isArray(slides) || slides.length === 0) {
      throw new Error("No slides provided");
    }

    // Ensure all slides have required fields
    const validSlides = slides.map(slide => ({
      title: slide.title || "Untitled Slide",
      content: Array.isArray(slide.content) ? slide.content : [],
    }));

    console.log("[aiService] Downloading PPTX with slides:", {
      count: validSlides.length,
      slides: validSlides.map(s => ({ title: s.title, contentCount: s.content.length })),
      theme,
      lectureTitle,
      customColor,
    });

    const response = await fetch("/api/ai/slides/download", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        slides: validSlides,
        theme,
        lectureTitle,
        customColor,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to download PowerPoint");
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${lectureTitle.replace(/[^a-z0-9\u0600-\u06FF]/gi, "_")}_slides.pptx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error: any) {
    console.error("[aiService] Error downloading PPTX:", error);
    throw error;
  }
}

