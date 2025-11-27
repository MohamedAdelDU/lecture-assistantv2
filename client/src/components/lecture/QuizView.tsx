import { useState } from "react";
import { Question } from "@/lib/mockData";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, HelpCircle, ArrowRight, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface QuizViewProps {
  questions: Question[];
}

export function QuizView({ questions }: QuizViewProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [quizComplete, setQuizComplete] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];

  const handleOptionSelect = (index: number) => {
    if (isAnswered) return;
    setSelectedOption(index);
  };

  const handleSubmit = () => {
    if (selectedOption === null) return;
    
    const isCorrect = selectedOption === currentQuestion.correctIndex;
    if (isCorrect) setScore(s => s + 1);
    
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
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setScore(0);
    setQuizComplete(false);
  };

  if (quizComplete) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-6">
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <CheckCircle className="w-12 h-12 text-primary" />
        </div>
        <h2 className="text-3xl font-bold">Quiz Complete!</h2>
        <p className="text-xl text-muted-foreground">
          You scored <span className="font-bold text-foreground">{score}</span> out of <span className="font-bold text-foreground">{questions.length}</span>
        </p>
        <Button onClick={handleRestart} size="lg" className="mt-4">
          <RotateCcw className="w-4 h-4 mr-2" />
          Retake Quiz
        </Button>
      </div>
    );
  }

  if (!currentQuestion) return <div>No questions available.</div>;

  return (
    <div className="max-w-2xl mx-auto mt-8">
      <div className="flex justify-between items-center mb-6 text-sm font-medium text-muted-foreground">
        <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
        <span>Score: {score}</span>
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
              Check Answer
            </Button>
          ) : (
            <Button onClick={handleNext}>
              {currentQuestionIndex === questions.length - 1 ? "Finish Quiz" : "Next Question"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
