import { useParams } from "wouter";
import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileText, List, HelpCircle, Presentation, Share2, Download, ChevronLeft, Trash2, X, Sparkles, Clock, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { Link, useLocation } from "wouter";
import { TranscriptView } from "@/components/lecture/TranscriptView";
import { SummaryView } from "@/components/lecture/SummaryView";
import { QuizView } from "@/components/lecture/QuizView";
import { SlidesView } from "@/components/lecture/SlidesView";
import { FlashcardsView } from "@/components/lecture/FlashcardsView";
import { ChatAssistant } from "@/components/lecture/ChatAssistant";
import { Brain } from "lucide-react";
import { useLecture, useLectures } from "@/hooks/useLectures";
import { generateSummary, generateQuiz, generateSlides, generateFlashcards } from "@/lib/aiService";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { jsPDF } from "jspdf";
import { useLanguage } from "@/contexts/LanguageContext";
import { Cpu, Cloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

export default function LectureView() {
  const { id } = useParams();
  const { lecture, isLoading } = useLecture(id);
  const { deleteLecture, updateLecture, isDeleting, isUpdating } = useLectures();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { language, isRTL } = useLanguage();
  const [selectedModel, setSelectedModel] = useState<"gpu" | "api">("api");

  const t = {
    loading: language === "ar" ? "جاري تحميل المحاضرة..." : "Loading lecture...",
    notFound: language === "ar" ? "المحاضرة غير موجودة." : "Lecture not found.",
    backToDashboard: language === "ar" ? "العودة للوحة التحكم" : "Back to Dashboard",
    stopProcessing: language === "ar" ? "إيقاف المعالجة" : "Stop Processing",
    rerunAI: language === "ar" ? "إعادة تشغيل الذكاء الاصطناعي" : "Re-run AI",
    share: language === "ar" ? "مشاركة" : "Share",
    exportAll: language === "ar" ? "تصدير الكل" : "Export All",
    delete: language === "ar" ? "حذف" : "Delete",
    deleting: language === "ar" ? "جاري الحذف..." : "Deleting...",
    areYouSure: language === "ar" ? "هل أنت متأكد؟" : "Are you sure?",
    deleteConfirm: language === "ar"
      ? "لا يمكن التراجع عن هذا الإجراء. سيتم حذف المحاضرة وكل بياناتها نهائياً."
      : "This action cannot be undone. This will permanently delete the lecture and all of its data.",
    cancel: language === "ar" ? "إلغاء" : "Cancel",
    transcript: language === "ar" ? "النص الكامل" : "Transcript",
    summary: language === "ar" ? "الملخص" : "Summary",
    quiz: language === "ar" ? "الاختبار" : "Quiz",
    slides: language === "ar" ? "الشرائح" : "Slides",
    cards: language === "ar" ? "البطاقات" : "Cards",
    status: {
      completed: language === "ar" ? "مكتمل" : "completed",
      processing: language === "ar" ? "جاري المعالجة" : "processing",
      failed: language === "ar" ? "فشل" : "failed",
    },
    toast: {
      exportSuccess: language === "ar" ? "تم التصدير بنجاح" : "Export successful",
      exportSuccessDesc: language === "ar" ? "تم تصدير كل المحتوى كملف PDF." : "All content has been exported as PDF.",
      exportFailed: language === "ar" ? "فشل التصدير" : "Export failed",
      exportFailedDesc: language === "ar" ? "فشل تصدير PDF. يرجى المحاولة مرة أخرى." : "Failed to export PDF. Please try again.",
      deleted: language === "ar" ? "تم حذف المحاضرة" : "Lecture deleted",
      deletedDesc: language === "ar" ? "تم حذف المحاضرة بنجاح." : "The lecture has been deleted successfully.",
      error: language === "ar" ? "خطأ" : "Error",
      stopProcessing: language === "ar" ? "تم إيقاف المعالجة" : "Processing stopped",
      stopProcessingDesc: language === "ar" ? "تم إيقاف معالجة المحاضرة." : "The lecture processing has been stopped.",
      cannotReprocess: language === "ar" ? "لا يمكن إعادة المعالجة" : "Cannot re-process",
      cannotReprocessDesc: language === "ar" ? "النص مفقود أو قصير جداً للمعالجة." : "Transcript is missing or too short to process.",
      reprocessStarted: language === "ar" ? "بدأت إعادة المعالجة" : "Re-processing started",
      reprocessStartedDesc: language === "ar" ? "جاري إعادة إنشاء الملخص والاختبار والشرائح لهذه المحاضرة." : "Regenerating summary, quiz, and slides for this lecture.",
      reprocessComplete: language === "ar" ? "اكتملت إعادة المعالجة" : "Re-processing complete",
      reprocessCompleteDesc: language === "ar" ? "تم إعادة إنشاء محتوى الذكاء الاصطناعي لهذه المحاضرة." : "AI content for this lecture has been regenerated.",
      reprocessFailed: language === "ar" ? "فشلت إعادة المعالجة" : "Re-processing failed",
      shared: language === "ar" ? "تمت المشاركة بنجاح" : "Shared successfully",
      sharedDesc: language === "ar" ? "تم مشاركة رابط المحاضرة." : "The lecture link has been shared.",
      copied: language === "ar" ? "تم النسخ" : "Copied to clipboard",
      copiedDesc: language === "ar" ? "تم نسخ رابط المحاضرة إلى الحافظة." : "Lecture link has been copied to your clipboard.",
    },
    selectModel: language === "ar" ? "اختر الموديل" : "Select Model",
    modelGpu: language === "ar" ? "LM-Titan (GPU)" : "LM-Titan (GPU)",
    modelApi: language === "ar" ? "LM-Cloud (API)" : "LM-Cloud (API)",
  };

  const handleExportAll = () => {
    if (!lecture) return;

    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - 2 * margin;
      let y = 20;

      // Check if content contains Arabic characters
      const contentText = [
        lecture.title,
        lecture.transcript,
        Array.isArray(lecture.summary) ? lecture.summary.join(" ") : lecture.summary || "",
        lecture.questions?.map((q: any) => q.question).join(" "),
        lecture.slides?.map((s: any) => s.content).join(" "),
      ].join(" ");
      const hasArabic = /[\u0600-\u06FF]/.test(contentText);

      // Helper function to add text
      const addText = (text: string, fontSize: number = 11, isBold: boolean = false) => {
        doc.setFontSize(fontSize);
        doc.setFont("helvetica", isBold ? "bold" : "normal");
        const lines = doc.splitTextToSize(text, maxWidth);
        lines.forEach((line: string) => {
          if (y > pageHeight - 20) {
            doc.addPage();
            y = 20;
          }
          doc.text(line, hasArabic ? pageWidth - margin : margin, y, {
            align: hasArabic ? "right" : "left",
          });
          y += fontSize * 0.5;
        });
        y += 5;
      };

      // Title
      addText(lecture.title, 20, true);
      y += 5;

      // Transcript
      if (lecture.transcript) {
        addText("TRANSCRIPT", 14, true);
        addText(lecture.transcript, 10);
        y += 10;
        doc.addPage();
        y = 20;
      }

      // Summary
      if (lecture.summary) {
        addText("SUMMARY", 14, true);
        if (Array.isArray(lecture.summary) && lecture.summary.length > 0) {
          lecture.summary.forEach((item: string, index: number) => {
            addText(`${index + 1}. ${item}`, 11);
          });
        } else if (typeof lecture.summary === "string") {
          addText(lecture.summary, 11);
        }
        y += 10;
        doc.addPage();
        y = 20;
      }

      // Quiz
      if (lecture.questions && lecture.questions.length > 0) {
        addText("QUIZ QUESTIONS", 14, true);
        lecture.questions.forEach((q: any, index: number) => {
          addText(`Question ${index + 1}: ${q.question}`, 11, true);
          if (q.options && q.options.length > 0) {
            q.options.forEach((opt: string, optIndex: number) => {
              addText(`  ${String.fromCharCode(65 + optIndex)}. ${opt}`, 10);
            });
          }
          if (q.correctAnswer !== undefined) {
            doc.setTextColor(0, 100, 0); // Green color
            addText(`Correct Answer: ${q.correctAnswer}`, 10);
            doc.setTextColor(0, 0, 0); // Reset to black
          }
          y += 5;
        });
        y += 10;
        doc.addPage();
        y = 20;
      }

      // Slides
      if (lecture.slides && lecture.slides.length > 0) {
        addText("SLIDES", 14, true);
        lecture.slides.forEach((slide: any, index: number) => {
          addText(`Slide ${index + 1}: ${slide.title || "Untitled"}`, 12, true);
          if (slide.content) {
            addText(slide.content, 10);
          }
          y += 5;
        });
      }

      // Save PDF
      const fileName = lecture.title.replace(/[^a-z0-9\u0600-\u06FF]/gi, "_") + "_export.pdf";
      doc.save(fileName);

      toast({
        title: t.toast.exportSuccess,
        description: t.toast.exportSuccessDesc,
      });
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast({
        title: t.toast.exportFailed,
        description: t.toast.exportFailedDesc,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!lecture) return;
    try {
      await deleteLecture(lecture.id);
      toast({
        title: t.toast.deleted,
        description: t.toast.deletedDesc,
      });
      setLocation("/dashboard");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete lecture.",
        variant: "destructive",
      });
    }
  };

  const handleStopProcessing = async () => {
    if (!lecture) return;
    try {
      await updateLecture({ lectureId: lecture.id, updates: { status: "failed" } });
      toast({
        title: t.toast.stopProcessing,
        description: t.toast.stopProcessingDesc,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to stop processing.",
        variant: "destructive",
      });
    }
  };

  const handleReprocess = async () => {
    if (!lecture) return;

    if (!lecture.transcript || lecture.transcript.length < 100) {
      toast({
        title: t.toast.cannotReprocess,
        description: t.toast.cannotReprocessDesc,
        variant: "destructive",
      });
      return;
    }

    try {
      // Mark as processing again
      await updateLecture({
        lectureId: lecture.id,
        updates: {
          status: "processing",
          progress: 10,
          // optionally clear previous AI outputs
          summary: [],
          questions: [],
          slides: [],
          flashcards: [],
        },
      });

      toast({
        title: t.toast.reprocessStarted,
        description: t.toast.reprocessStartedDesc,
      });

      const transcript = lecture.transcript;

      // Generate summary with selected model
      const summary = await generateSummary(transcript, selectedModel);
      await updateLecture({
        lectureId: lecture.id,
        updates: {
          progress: 50,
          summary,
        },
      });

      // Generate quiz with selected model
      const questions = await generateQuiz(transcript, selectedModel);
      await updateLecture({
        lectureId: lecture.id,
        updates: {
          progress: 60,
          questions,
        },
      });

      // Generate slides
      const slides = await generateSlides(transcript, summary);
      await updateLecture({
        lectureId: lecture.id,
        updates: {
          progress: 80,
          slides,
        },
      });

      // Generate flashcards with selected model
      const flashcards = await generateFlashcards(transcript, selectedModel);
      await updateLecture({
        lectureId: lecture.id,
        updates: {
          progress: 100,
          flashcards,
          status: "completed",
        },
      });

      toast({
        title: t.toast.reprocessComplete,
        description: t.toast.reprocessCompleteDesc,
      });
    } catch (error: any) {
      console.error("Error re-processing lecture:", error);
      await updateLecture({
        lectureId: lecture.id,
        updates: { status: "failed" },
      });
      toast({
        title: t.toast.reprocessFailed,
        description: error?.message || (language === "ar" ? "فشل إعادة معالجة هذه المحاضرة." : "Failed to re-process this lecture."),
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">{t.loading}</div>
        </div>
      </AppLayout>
    );
  }

  if (!lecture) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">{t.notFound}</p>
            <Link href="/dashboard">
              <Button>{t.backToDashboard}</Button>
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8 pb-20">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="pl-0 hover:bg-transparent text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className={`w-4 h-4 ${language === "ar" ? "ml-1" : "mr-1"}`} />
              {t.backToDashboard}
            </Button>
          </Link>
          
          {/* Lecture Header Card */}
          <div className="bg-gradient-to-br from-card via-card to-card/80 border rounded-2xl p-6 shadow-lg shadow-primary/5">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Thumbnail */}
              {lecture.thumbnailUrl && (
                <div className="relative w-full lg:w-80 aspect-video rounded-xl overflow-hidden flex-shrink-0 shadow-md group">
                  <img 
                    src={lecture.thumbnailUrl} 
                    alt={lecture.title}
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                    <Badge className="bg-black/70 text-white border-0 backdrop-blur-sm">
                      <Clock className="w-3 h-3 mr-1" />
                      {lecture.duration}
                    </Badge>
                  </div>
                </div>
              )}
              
              {/* Content */}
              <div className="flex-1 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={lecture.status === "completed" ? "default" : lecture.status === "processing" ? "secondary" : "destructive"} className="text-xs font-semibold">
                    {t.status[lecture.status as keyof typeof t.status] || lecture.status}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <Calendar className="w-3 h-3 mr-1" />
                    {lecture.date}
                  </Badge>
                </div>
                
                <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-foreground leading-tight">
                  {lecture.title}
                </h1>
                
                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-2">
              {lecture.status === "processing" && (
                <Button variant="outline" onClick={handleStopProcessing} disabled={isUpdating}>
                  <X className={`w-4 h-4 ${language === "ar" ? "ml-2" : "mr-2"}`} />
                  {t.stopProcessing}
                </Button>
              )}
                  {lecture.status === "processing" && (
                    <Button variant="outline" onClick={handleStopProcessing} disabled={isUpdating} className="border-orange-200 text-orange-600 hover:bg-orange-50">
                      <X className={`w-4 h-4 ${language === "ar" ? "ml-2" : "mr-2"}`} />
                      {t.stopProcessing}
                    </Button>
                  )}
                  
                  {(lecture.status === "completed" || lecture.status === "failed") && (
                    <>
                      <div className="flex gap-1 border rounded-lg p-1 bg-secondary/30 backdrop-blur-sm">
                        <button
                          onClick={() => setSelectedModel("gpu")}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                            selectedModel === "gpu"
                              ? "bg-primary text-primary-foreground shadow-sm scale-105"
                              : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                          }`}
                        >
                          <Cpu className="w-3 h-3" />
                          {t.modelGpu}
                        </button>
                        <button
                          onClick={() => setSelectedModel("api")}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                            selectedModel === "api"
                              ? "bg-primary text-primary-foreground shadow-sm scale-105"
                              : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                          }`}
                        >
                          <Cloud className="w-3 h-3" />
                          {t.modelApi}
                        </button>
                      </div>
                      <Button
                        variant="outline"
                        onClick={handleReprocess}
                        disabled={isUpdating}
                        className="hover:bg-primary/10 hover:border-primary/50"
                      >
                        <Sparkles className={`w-4 h-4 ${language === "ar" ? "ml-2" : "mr-2"}`} />
                        {t.rerunAI}
                      </Button>
                    </>
                  )}
                  
                  <Button 
                    variant="outline"
                    onClick={async () => {
                      const url = window.location.href;
                      if (navigator.share) {
                        try {
                          await navigator.share({
                            title: lecture.title,
                            text: language === "ar" ? `اطلع على هذه المحاضرة: ${lecture.title}` : `Check out this lecture: ${lecture.title}`,
                            url: url,
                          });
                          toast({
                            title: t.toast.shared,
                            description: t.toast.sharedDesc,
                          });
                        } catch (error: any) {
                          if (error.name !== "AbortError") {
                            await navigator.clipboard.writeText(url);
                            toast({
                              title: t.toast.copied,
                              description: t.toast.copiedDesc,
                            });
                          }
                        }
                      } else {
                        await navigator.clipboard.writeText(url);
                        toast({
                          title: t.toast.copied,
                          description: t.toast.copiedDesc,
                        });
                      }
                    }}
                    className="hover:bg-primary/10 hover:border-primary/50"
                  >
                    <Share2 className={`w-4 h-4 ${language === "ar" ? "ml-2" : "mr-2"}`} />
                    {t.share}
                  </Button>
                  
                  <Button 
                    onClick={handleExportAll} 
                    disabled={!lecture || lecture.status !== "completed"}
                    className="bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg transition-all"
                  >
                    <Download className={`w-4 h-4 ${language === "ar" ? "ml-2" : "mr-2"}`} />
                    {t.exportAll}
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="hover:bg-destructive/90">
                        <Trash2 className={`w-4 h-4 ${language === "ar" ? "ml-2" : "mr-2"}`} />
                        {t.delete}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t.areYouSure}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t.deleteConfirm} "{lecture.title}"
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isDeleting}>
                          {isDeleting ? t.deleting : t.delete}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >

          <Tabs defaultValue="summary" className="w-full">
            <div className="border-b border-border/40 mb-6">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 h-auto bg-transparent p-0 gap-1">
                <TabsTrigger 
                  value="transcript"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm rounded-lg px-4 py-2.5 transition-all"
                >
                  <FileText className={`w-4 h-4 ${language === "ar" ? "ml-2" : "mr-2"}`} />
                  <span className="hidden sm:inline">{t.transcript}</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="summary"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm rounded-lg px-4 py-2.5 transition-all"
                >
                  <List className={`w-4 h-4 ${language === "ar" ? "ml-2" : "mr-2"}`} />
                  <span className="hidden sm:inline">{t.summary}</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="quiz"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm rounded-lg px-4 py-2.5 transition-all"
                >
                  <HelpCircle className={`w-4 h-4 ${language === "ar" ? "ml-2" : "mr-2"}`} />
                  <span className="hidden sm:inline">{t.quiz}</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="slides"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm rounded-lg px-4 py-2.5 transition-all"
                >
                  <Presentation className={`w-4 h-4 ${language === "ar" ? "ml-2" : "mr-2"}`} />
                  <span className="hidden sm:inline">{t.slides}</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="flashcards"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm rounded-lg px-4 py-2.5 transition-all"
                >
                  <Brain className={`w-4 h-4 ${language === "ar" ? "ml-2" : "mr-2"}`} />
                  <span className="hidden sm:inline">{t.cards}</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="min-h-[500px]">
              <TabsContent value="transcript" className="mt-0 animate-in fade-in-50 duration-300">
                {lecture.status === "processing" && !lecture.transcript ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <Spinner className="w-8 h-8 text-primary" />
                    <p className="text-muted-foreground text-sm">
                      {language === "ar" ? "جاري تحويل الصوت إلى نص..." : "Transcribing audio..."}
                    </p>
                  </div>
                ) : (
                  <TranscriptView text={lecture.transcript || "No transcript available."} title={lecture.title} />
                )}
              </TabsContent>
              
              <TabsContent value="summary" className="mt-0 animate-in fade-in-50 duration-300">
                {lecture.status === "processing" && (!lecture.summary || (Array.isArray(lecture.summary) && lecture.summary.length === 0) || (typeof lecture.summary === "string" && lecture.summary.trim().length === 0)) ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <Spinner className="w-8 h-8 text-primary" />
                    <p className="text-muted-foreground text-sm">
                      {language === "ar" ? "جاري إنشاء الملخص..." : "Generating summary..."}
                    </p>
                    {lecture.progress !== undefined && (
                      <div className="w-full max-w-md space-y-2">
                        <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                          <div className="bg-primary h-full transition-all duration-300" style={{ width: `${Math.min(lecture.progress, 50)}%` }} />
                        </div>
                        <p className="text-xs text-muted-foreground text-center">{lecture.progress}%</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <SummaryView summary={lecture.summary || []} title={lecture.title} />
                )}
              </TabsContent>
              
              <TabsContent value="quiz" className="mt-0 animate-in fade-in-50 duration-300">
                {lecture.status === "processing" && (!lecture.questions || lecture.questions.length === 0) ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <Spinner className="w-8 h-8 text-primary" />
                    <p className="text-muted-foreground text-sm">
                      {language === "ar" ? "جاري إنشاء الأسئلة..." : "Generating quiz questions..."}
                    </p>
                    {lecture.progress !== undefined && (
                      <div className="w-full max-w-md space-y-2">
                        <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                          <div className="bg-primary h-full transition-all duration-300" style={{ width: `${Math.min(lecture.progress, 60)}%` }} />
                        </div>
                        <p className="text-xs text-muted-foreground text-center">{lecture.progress}%</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <QuizView questions={lecture.questions || []} title={lecture.title} />
                )}
              </TabsContent>
              
              <TabsContent value="slides" className="mt-0 animate-in fade-in-50 duration-300">
                {lecture.status === "processing" && (!lecture.slides || lecture.slides.length === 0) ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <Spinner className="w-8 h-8 text-primary" />
                    <p className="text-muted-foreground text-sm">
                      {language === "ar" ? "جاري إنشاء الشرائح..." : "Generating slides..."}
                    </p>
                    {lecture.progress !== undefined && (
                      <div className="w-full max-w-md space-y-2">
                        <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                          <div className="bg-primary h-full transition-all duration-300" style={{ width: `${Math.min(lecture.progress, 80)}%` }} />
                        </div>
                        <p className="text-xs text-muted-foreground text-center">{lecture.progress}%</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <SlidesView
                    slides={lecture.slides || []}
                    title={lecture.title}
                    transcript={lecture.transcript}
                    summary={lecture.summary}
                    lectureId={lecture.id}
                  />
                )}
              </TabsContent>

              <TabsContent value="flashcards" className="mt-0 animate-in fade-in-50 duration-300">
                {lecture.status === "processing" && (!lecture.flashcards || lecture.flashcards.length === 0) ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <Spinner className="w-8 h-8 text-primary" />
                    <p className="text-muted-foreground text-sm">
                      {language === "ar" ? "جاري إنشاء البطاقات التعليمية..." : "Generating flashcards..."}
                    </p>
                    {lecture.progress !== undefined && (
                      <div className="w-full max-w-md space-y-2">
                        <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                          <div className="bg-primary h-full transition-all duration-300" style={{ width: `${Math.min(lecture.progress, 100)}%` }} />
                        </div>
                        <p className="text-xs text-muted-foreground text-center">{lecture.progress}%</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <FlashcardsView flashcards={lecture?.flashcards} />
                )}
              </TabsContent>
            </div>
          </Tabs>
        </motion.div>
      </div>
      <ChatAssistant />
    </AppLayout>
  );
}
