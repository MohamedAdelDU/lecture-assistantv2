import { useState } from "react";
import { Question } from "@/lib/mockData";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, HelpCircle, ArrowRight, RotateCcw, Download, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

interface QuizViewProps {
  questions: Question[];
  title?: string;
}

export function QuizView({ questions, title = "Quiz" }: QuizViewProps) {
  const { language } = useLanguage();
  const { toast } = useToast();

  const t = {
    complete: language === "ar" ? "اكتمل الاختبار!" : "Quiz Complete!",
    scored: language === "ar" ? "حصلت على" : "You scored",
    outOf: language === "ar" ? "من" : "out of",
    retake: language === "ar" ? "إعادة الاختبار" : "Retake Quiz",
    noQuestions: language === "ar" ? "لا توجد أسئلة متاحة." : "No questions available.",
    question: language === "ar" ? "سؤال" : "Question",
    score: language === "ar" ? "النتيجة" : "Score",
    checkAnswer: language === "ar" ? "تحقق من الإجابة" : "Check Answer",
    nextQuestion: language === "ar" ? "السؤال التالي" : "Next Question",
    finishQuiz: language === "ar" ? "إنهاء الاختبار" : "Finish Quiz",
    reviewAnswers: language === "ar" ? "مراجعة إجاباتي" : "Review My Answers",
    hideReview: language === "ar" ? "إخفاء المراجعة" : "Hide Review",
    correctAnswer: language === "ar" ? "الإجابة الصحيحة" : "Correct Answer",
    yourAnswer: language === "ar" ? "إجابتك" : "Your Answer",
    exportPDF: language === "ar" ? "تصدير PDF" : "Export PDF",
    startQuiz: language === "ar" ? "بدء الاختبار" : "Start Quiz",
    viewQuestions: language === "ar" ? "عرض الأسئلة مع الإجابات" : "View Questions with Answers",
    chooseMode: language === "ar" ? "اختر وضع الاختبار" : "Choose Quiz Mode",
    viewModeDesc: language === "ar" ? "عرض جميع الأسئلة مع الإجابات الصحيحة للمراجعة" : "View all questions with correct answers for review",
    quizModeDesc: language === "ar" ? "ابدأ الاختبار وأجب عن الأسئلة" : "Start the quiz and answer the questions",
    backToMenu: language === "ar" ? "العودة للقائمة" : "Back to Menu",
    toast: {
      exported: language === "ar" ? "تم تصدير PDF" : "PDF exported",
      exportedDesc: language === "ar" ? "تم تصدير الاختبار كملف PDF." : "The quiz has been exported as PDF.",
      exportFailed: language === "ar" ? "فشل التصدير" : "Export failed",
      exportFailedDesc: language === "ar" ? "فشل تصدير PDF. يرجى المحاولة مرة أخرى." : "Failed to export PDF. Please try again.",
    },
  };

  const [quizMode, setQuizMode] = useState<"menu" | "view" | "quiz" | "review">("menu");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [quizComplete, setQuizComplete] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});

  const currentQuestion = questions[currentQuestionIndex];

  const handleOptionSelect = (index: number) => {
    if (isAnswered) return;
    setSelectedOption(index);
  };

  const handleSubmit = () => {
    if (selectedOption === null) return;
    
    const isCorrect = selectedOption === currentQuestion.correctIndex;
    if (isCorrect) setScore(s => s + 1);
    
    // Save user's answer
    setUserAnswers(prev => ({ ...prev, [currentQuestionIndex]: selectedOption }));
    
    setIsAnswered(true);
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(i => i + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setQuizComplete(true);
    }
  };

  const handleRestart = () => {
    setQuizMode("menu");
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setScore(0);
    setQuizComplete(false);
    setUserAnswers({});
  };

  const handleStartQuiz = () => {
    setQuizMode("quiz");
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setScore(0);
    setQuizComplete(false);
    setUserAnswers({});
  };

  const handleViewQuestions = () => {
    setQuizMode("view");
  };

  const handleExportPDF = async () => {
    try {
      const hasArabic = /[\u0600-\u06FF]/.test(
        questions.map(q => q.text + q.options.join(" ")).join(" ") + title
      );
      const dir = hasArabic ? "rtl" : "ltr";
      const textAlign = hasArabic ? "right" : "left";

      // Define colors based on the site's theme
      const primaryColor = "#8B5CF6"; // hsl(250 84% 65%)
      const darkTextColor = "#0A0A0B"; // hsl(240 10% 3.9%)
      const mutedForeground = "#6B7280"; // hsl(240 4% 46%)
      const cardBackground = "#FFFFFF"; // hsl(0 0% 100%)
      const secondaryBackground = "#F4F4F5"; // hsl(240 5% 96%)
      const borderColor = "#E4E4E7"; // hsl(240 6% 90%)
      const correctColor = "#10B981"; // Green for correct answers
      const incorrectColor = "#EF4444"; // Red for incorrect answers

      // Build questions HTML
      const questionsHTML = questions.map((q, qIndex) => {
        const userAnswer = userAnswers[qIndex];
        const isCorrect = userAnswer === q.correctIndex;
        
        const optionsHTML = q.options.map((option, optIndex) => {
          const isCorrectOption = optIndex === q.correctIndex;
          const isUserOption = userAnswer === optIndex;
          
          let optionStyle = `padding: 10px; margin-bottom: 8px; border-radius: 8px; border: 2px solid ${borderColor}; background-color: ${cardBackground};`;
          let optionLabel = "";
          
          if (isCorrectOption) {
            optionStyle += ` border-color: ${correctColor}; background-color: #ECFDF5;`;
            optionLabel = `<span style="color: ${correctColor}; font-weight: bold; margin-${hasArabic ? "right" : "left"}: 8px;">✓ ${language === "ar" ? "صحيح" : "Correct"}</span>`;
          }
          
          if (isUserOption && !isCorrectOption) {
            optionStyle += ` border-color: ${incorrectColor}; background-color: #FEF2F2;`;
            optionLabel = `<span style="color: ${incorrectColor}; font-weight: bold; margin-${hasArabic ? "right" : "left"}: 8px;">✗ ${language === "ar" ? "إجابتك" : "Your Answer"}</span>`;
          }
          
          if (isUserOption && isCorrectOption) {
            optionLabel = `<span style="color: ${correctColor}; font-weight: bold; margin-${hasArabic ? "right" : "left"}: 8px;">✓ ${language === "ar" ? "إجابتك - صحيح" : "Your Answer - Correct"}</span>`;
          }
          
          const optionLetter = String.fromCharCode(65 + optIndex);
          
          return `
            <div style="${optionStyle}">
              <div style="display: flex; justify-content: space-between; align-items: center; direction: ${dir};">
                <span style="color: ${darkTextColor};">
                  <strong style="color: ${primaryColor};">${optionLetter}.</strong> ${option}
                </span>
                ${optionLabel}
              </div>
            </div>
          `;
        }).join("");

        return `
          <div style="margin-bottom: 25px; page-break-inside: avoid; padding: 15px; background-color: ${secondaryBackground}; border-radius: 8px; border-${hasArabic ? "right" : "left"}: 4px solid ${primaryColor};">
            <h3 style="font-size: 16px; font-weight: bold; color: ${primaryColor}; margin-bottom: 12px; text-align: ${textAlign};">
              ${language === "ar" ? "سؤال" : "Question"} ${qIndex + 1}
            </h3>
            <p style="font-size: 14px; color: ${darkTextColor}; margin-bottom: 12px; text-align: ${textAlign}; line-height: 1.8;">
              ${q.text}
            </p>
            <div style="margin-top: 12px;">
              ${optionsHTML}
            </div>
          </div>
        `;
      }).join("");

      // Score summary (only if quiz was taken)
      const scoreHTML = Object.keys(userAnswers).length > 0 ? `
        <div style="margin-bottom: 20px; padding: 15px; background-color: ${secondaryBackground}; border-radius: 8px; border-${hasArabic ? "right" : "left"}: 4px solid ${primaryColor};">
          <p style="font-size: 14px; color: ${darkTextColor}; text-align: ${textAlign};">
            <strong style="color: ${primaryColor};">${language === "ar" ? "النتيجة:" : "Score:"}</strong>
            <span style="margin-${hasArabic ? "right" : "left"}: 8px;">${score} ${language === "ar" ? "من" : "out of"} ${questions.length}</span>
          </p>
        </div>
      ` : "";

      const htmlContent = `
        <div style="font-family: 'Tajawal', Arial, sans-serif; direction: ${dir}; color: ${darkTextColor}; line-height: 1.8; padding: 20px; background-color: ${cardBackground}; border: 1px solid ${borderColor};">
          <div style="text-align: center; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 3px solid ${primaryColor};">
            <h1 style="font-size: 24px; font-weight: bold; color: ${primaryColor}; margin: 0;">
              ${title}
            </h1>
            <p style="font-size: 12px; color: ${mutedForeground}; margin-top: 10px;">
              ${language === "ar" ? "تم التصدير بواسطة Lecture Assistant" : "Exported by Lecture Assistant"} • ${new Date().toLocaleDateString(language === "ar" ? "ar-EG" : "en-US")}
            </p>
          </div>
          
          ${scoreHTML}
          
          <div style="margin-bottom: 20px;">
            <h2 style="font-size: 18px; font-weight: bold; color: ${primaryColor}; border-bottom: 2px solid ${primaryColor}; padding-bottom: 5px; margin-bottom: 15px; text-align: ${textAlign};">
              ${language === "ar" ? "📝 الأسئلة والإجابات" : "📝 Questions and Answers"}
            </h2>
            ${questionsHTML}
          </div>
          
          <div style="margin-top: 30px; padding-top: 15px; border-top: 2px solid ${borderColor}; text-align: center;">
            <p style="font-size: 9px; color: ${mutedForeground};">
              ${language === "ar" ? "© 2025 Lecture Assistant. جميع الحقوق محفوظة. هذا المستند محمي بحقوق النشر ولا يجوز نسخه أو توزيعه دون إذن." : "© 2025 Lecture Assistant. All rights reserved. This document is protected by copyright and may not be copied or distributed without permission."}
            </p>
          </div>
        </div>
      `;

      const container = document.createElement("div");
      container.innerHTML = htmlContent;
      container.style.position = "absolute";
      container.style.left = "-9999px";
      container.style.top = "0";
      container.style.width = "210mm"; // A4 width
      container.style.padding = "15mm";
      container.style.backgroundColor = "white";
      container.style.fontFamily = hasArabic ? "Tajawal, Arial, sans-serif" : "Arial, sans-serif";
      document.body.appendChild(container);

      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 794,
        windowHeight: container.scrollHeight,
      });

      document.body.removeChild(container);

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      const pdf = new jsPDF("p", "mm", "a4");
      const imgData = canvas.toDataURL("image/jpeg", 0.95);

      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const filename = `${title.replace(/[^a-z0-9\u0600-\u06FF]/gi, "_")}_quiz.pdf`;
      pdf.save(filename);

      toast({
        title: t.toast.exported,
        description: t.toast.exportedDesc,
      });
    } catch (error) {
      console.error("Error exporting quiz PDF:", error);
      toast({
        title: t.toast.exportFailed,
        description: t.toast.exportFailedDesc,
        variant: "destructive",
      });
    }
  };

  // Menu screen - choose mode
  if (quizMode === "menu") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center justify-center py-12 text-center space-y-10 max-w-4xl mx-auto px-4"
      >
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="space-y-4"
        >
          <div className="relative inline-block">
            <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-purple-600 to-primary bg-clip-text text-transparent">
              {t.chooseMode}
            </h2>
            <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
          </div>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            {language === "ar" ? "اختر كيف تريد استخدام الاختبار" : "Choose how you want to use the quiz"}
          </p>
        </motion.div>
        
        {/* Mode Cards Grid */}
        <div className="grid md:grid-cols-2 gap-6 w-full">
          {/* View Mode Card */}
          <motion.div
            initial={{ opacity: 0, x: language === "ar" ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card 
              className="border-2 hover:border-primary/60 transition-all duration-300 cursor-pointer group relative overflow-hidden h-full bg-gradient-to-br from-background to-background/50"
              onClick={handleViewQuestions}
            >
              {/* Decorative gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <CardHeader className="relative z-10 pb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors duration-300">
                    <Eye className="w-6 h-6 text-primary group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <CardTitle className="text-xl font-bold group-hover:text-primary transition-colors duration-300">
                    {t.viewQuestions}
                  </CardTitle>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed text-left">
                  {t.viewModeDesc}
                </p>
              </CardHeader>
              
              <CardFooter className="relative z-10 pt-0">
                <Button 
                  className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300" 
                  variant="outline"
                >
                  <Eye className={`w-4 h-4 ${language === "ar" ? "ml-2" : "mr-2"} group-hover:scale-110 transition-transform duration-300`} />
                  {t.viewQuestions}
                  <ArrowRight className={`w-4 h-4 ${language === "ar" ? "mr-2 rotate-180 group-hover:-translate-x-1" : "ml-2 group-hover:translate-x-1"} transition-transform duration-300`} />
                </Button>
              </CardFooter>
            </Card>
          </motion.div>

          {/* Quiz Mode Card */}
          <motion.div
            initial={{ opacity: 0, x: language === "ar" ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card 
              className="border-2 border-primary/30 hover:border-primary transition-all duration-300 cursor-pointer group relative overflow-hidden h-full bg-gradient-to-br from-primary/5 via-background to-background shadow-lg"
              onClick={handleStartQuiz}
            >
              {/* Decorative gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent opacity-100 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Badge */}
              <div className="absolute top-4 right-4 z-10">
                <span className="px-2 py-1 text-xs font-semibold bg-primary text-primary-foreground rounded-full shadow-md">
                  {language === "ar" ? "مُوصى به" : "Recommended"}
                </span>
              </div>
              
              <CardHeader className="relative z-10 pb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 rounded-xl bg-primary group-hover:bg-primary/90 transition-colors duration-300 shadow-lg">
                    <HelpCircle className="w-6 h-6 text-primary-foreground group-hover:scale-110 transition-transform duration-300" />
                  </div>
                  <CardTitle className="text-xl font-bold text-primary group-hover:scale-105 transition-transform duration-300">
                    {t.startQuiz}
                  </CardTitle>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed text-left">
                  {t.quizModeDesc}
                </p>
              </CardHeader>
              
              <CardFooter className="relative z-10 pt-0">
                <Button 
                  className="w-full bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <HelpCircle className={`w-4 h-4 ${language === "ar" ? "ml-2" : "mr-2"} group-hover:scale-110 transition-transform duration-300`} />
                  {t.startQuiz}
                  <ArrowRight className={`w-4 h-4 ${language === "ar" ? "mr-2 rotate-180 group-hover:-translate-x-1" : "ml-2 group-hover:translate-x-1"} transition-transform duration-300`} />
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        </div>

        {/* Additional Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground pt-4"
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary/50" />
            <span>{language === "ar" ? `${questions.length} سؤال متاح` : `${questions.length} questions available`}</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-muted-foreground" />
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            <span>{language === "ar" ? "يمكنك تصدير النتائج كـ PDF" : "Export results as PDF"}</span>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // Quiz complete screen
  if (quizComplete && quizMode === "quiz") {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-6">
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <CheckCircle className="w-12 h-12 text-primary" />
        </div>
        <h2 className="text-3xl font-bold">{t.complete}</h2>
        <p className="text-xl text-muted-foreground">
          {t.scored} <span className="font-bold text-foreground">{score}</span> {t.outOf} <span className="font-bold text-foreground">{questions.length}</span>
        </p>
        <div className="flex gap-3 mt-4">
          <Button onClick={() => setQuizMode("review")} size="lg" variant="outline">
            <Eye className={`w-4 h-4 ${language === "ar" ? "ml-2" : "mr-2"}`} />
            {t.reviewAnswers}
          </Button>
          <Button onClick={handleExportPDF} size="lg" variant="outline">
            <Download className={`w-4 h-4 ${language === "ar" ? "ml-2" : "mr-2"}`} />
            {t.exportPDF}
          </Button>
          <Button onClick={handleRestart} size="lg">
            <RotateCcw className={`w-4 h-4 ${language === "ar" ? "ml-2" : "mr-2"}`} />
            {t.retake}
          </Button>
        </div>
      </div>
    );
  }

  // View mode - show all questions with correct answers (no user answers)
  if (quizMode === "view") {
    return (
      <div className="max-w-4xl mx-auto mt-8 space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">{t.viewQuestions}</h2>
            <p className="text-muted-foreground mt-1">
              {language === "ar" ? "جميع الأسئلة مع الإجابات الصحيحة" : "All questions with correct answers"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleExportPDF} variant="outline">
              <Download className={`w-4 h-4 ${language === "ar" ? "ml-2" : "mr-2"}`} />
              {t.exportPDF}
            </Button>
            <Button onClick={() => setQuizMode("menu")} variant="outline">
              {t.backToMenu}
            </Button>
          </div>
        </div>

        {questions.map((q, qIndex) => (
          <Card key={qIndex} className="border-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="text-primary font-bold">{qIndex + 1}.</span>
                {q.text}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {q.options.map((option, optIndex) => {
                const isCorrectOption = optIndex === q.correctIndex;
                
                let optionStyle = "border p-3 rounded-lg";
                if (isCorrectOption) {
                  optionStyle += " border-green-500 bg-green-50/50 dark:bg-green-900/20";
                } else {
                  optionStyle += " border opacity-50";
                }
                
                return (
                  <div key={optIndex} className={cn(optionStyle, "flex items-center justify-between")}>
                    <span className="flex-1">
                      <span className="font-medium mr-2">{String.fromCharCode(65 + optIndex)}.</span>
                      {option}
                    </span>
                    {isCorrectOption && (
                      <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                        <CheckCircle className="w-4 h-4" />
                        <span>{t.correctAnswer}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}

        {/* Start Quiz button at the end */}
        <div className="flex justify-center pt-6 border-t">
          <Button onClick={handleStartQuiz} size="lg" className="min-w-[200px]">
            <HelpCircle className={`w-5 h-5 ${language === "ar" ? "ml-2" : "mr-2"}`} />
            {t.startQuiz}
          </Button>
        </div>
      </div>
    );
  }

  // Review mode - show all questions with user answers vs correct answers
  if (quizMode === "review") {
    return (
      <div className="max-w-4xl mx-auto mt-8 space-y-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">{t.reviewAnswers}</h2>
            <p className="text-muted-foreground mt-1">
              {t.scored} <span className="font-bold">{score}</span> {t.outOf} <span className="font-bold">{questions.length}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleExportPDF} variant="outline">
              <Download className={`w-4 h-4 ${language === "ar" ? "ml-2" : "mr-2"}`} />
              {t.exportPDF}
            </Button>
            <Button onClick={() => setQuizMode("menu")} variant="outline">
              {t.backToMenu}
            </Button>
          </div>
        </div>

        {questions.map((q, qIndex) => {
          const userAnswer = userAnswers[qIndex];
          const isCorrect = userAnswer === q.correctIndex;
          
          return (
            <Card key={qIndex} className="border-2">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="text-primary font-bold">{qIndex + 1}.</span>
                  {q.text}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {q.options.map((option, optIndex) => {
                  const isCorrectOption = optIndex === q.correctIndex;
                  const isUserOption = userAnswer === optIndex;
                  
                  let optionStyle = "border p-3 rounded-lg";
                  if (isCorrectOption) {
                    optionStyle += " border-green-500 bg-green-50/50 dark:bg-green-900/20";
                  } else if (isUserOption && !isCorrectOption) {
                    optionStyle += " border-red-500 bg-red-50/50 dark:bg-red-900/20";
                  } else {
                    optionStyle += " border opacity-50";
                  }
                  
                  return (
                    <div key={optIndex} className={cn(optionStyle, "flex items-center justify-between")}>
                      <span className="flex-1">
                        <span className="font-medium mr-2">{String.fromCharCode(65 + optIndex)}.</span>
                        {option}
                      </span>
                      <div className="flex items-center gap-2">
                        {isCorrectOption && (
                          <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                            <CheckCircle className="w-4 h-4" />
                            <span>{t.correctAnswer}</span>
                          </div>
                        )}
                        {isUserOption && (
                          <div className={cn(
                            "flex items-center gap-1 text-sm font-medium",
                            isCorrect ? "text-green-600" : "text-red-600"
                          )}>
                            {isCorrect ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                            <span>{t.yourAnswer}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  // Quiz mode - active quiz
  if (quizMode === "quiz") {
    if (!currentQuestion) return <div>{t.noQuestions}</div>;

    return (
    <div className="max-w-2xl mx-auto mt-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Button onClick={() => setQuizMode("menu")} variant="ghost" size="sm">
            <ArrowRight className={`w-4 h-4 ${language === "ar" ? "ml-1 rotate-180" : "mr-1"}`} />
            {t.backToMenu}
          </Button>
          <div className="text-sm font-medium text-muted-foreground">
            <span>{t.question} {currentQuestionIndex + 1} {t.outOf} {questions.length}</span>
          </div>
        </div>
        <div className="text-sm font-medium text-muted-foreground">
          <span>{t.score}: {score}</span>
        </div>
      </div>

      <Card className="border-2">
        <CardHeader>
          <CardTitle className="text-xl leading-relaxed">
            {currentQuestion.text}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {currentQuestion.options.map((option, index) => {
            let optionStyle = "border hover:bg-accent hover:text-accent-foreground cursor-pointer";
            
            if (isAnswered) {
              if (index === currentQuestion.correctIndex) {
                optionStyle = "border-green-500 bg-green-50/50 text-green-700 dark:bg-green-900/20 dark:text-green-400";
              } else if (index === selectedOption) {
                optionStyle = "border-red-500 bg-red-50/50 text-red-700 dark:bg-red-900/20 dark:text-red-400";
              } else {
                optionStyle = "border opacity-50";
              }
            } else if (selectedOption === index) {
              optionStyle = "border-primary bg-primary/5 ring-1 ring-primary";
            }

            return (
              <div
                key={index}
                onClick={() => handleOptionSelect(index)}
                className={cn(
                  "p-4 rounded-lg transition-all duration-200 flex items-center justify-between",
                  optionStyle
                )}
              >
                <span>{option}</span>
                {isAnswered && index === currentQuestion.correctIndex && (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                )}
                {isAnswered && index === selectedOption && index !== currentQuestion.correctIndex && (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
              </div>
            );
          })}
        </CardContent>
        <CardFooter className="justify-end pt-6">
          {!isAnswered ? (
            <Button onClick={handleSubmit} disabled={selectedOption === null}>
              {t.checkAnswer}
            </Button>
          ) : (
            <Button onClick={handleNext}>
              {currentQuestionIndex === questions.length - 1 ? t.finishQuiz : t.nextQuestion}
              <ArrowRight className={`w-4 h-4 ${language === "ar" ? "mr-2" : "ml-2"}`} />
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
    );
  }

  return null;
}
