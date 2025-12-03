import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Brain, Target, Clock } from "lucide-react";
import type { Flashcard } from "@/lib/mockData";
import { useLanguage } from "@/contexts/LanguageContext";

interface FlashcardsViewProps {
  flashcards?: Flashcard[];
}

export function FlashcardsView({ flashcards = [] }: FlashcardsViewProps) {
  const { language } = useLanguage();
  
  // Detect content language from flashcards
  const detectContentLanguage = flashcards.length > 0 && /[\u0600-\u06FF]/.test(
    flashcards.map(c => c.term + c.definition).join(" ")
  ) ? "ar" : "en";
  
  // Use detected content language for display direction
  const displayDir = detectContentLanguage === "ar" ? "rtl" : "ltr";
  const displayTextAlign = detectContentLanguage === "ar" ? "right" : "left";
  // If no flashcards provided, show empty state
  if (!flashcards || flashcards.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Study Flashcards
          </h3>
          <Badge variant="outline" className="bg-primary/5">0 Cards</Badge>
        </div>
        <div className="text-center py-12 text-muted-foreground">
          <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>{language === "ar" ? "لا توجد بطاقات تعليمية متاحة بعد. قم بإنشاء بطاقات من النص." : "No flashcards available yet. Generate flashcards from the transcript."}</p>
        </div>
      </div>
    );
  }

  const t = {
    studyFlashcards: language === "ar" ? "بطاقات الدراسة" : "Study Flashcards",
    cards: language === "ar" ? "بطاقة" : "Cards",
    term: language === "ar" ? "مصطلح" : "Term",
    definition: language === "ar" ? "تعريف" : "Definition",
    hoverToFlip: language === "ar" ? "مرر للقلب" : "Hover to flip",
    noFlashcards: language === "ar" ? "لا توجد بطاقات تعليمية متاحة بعد. قم بإنشاء بطاقات من النص." : "No flashcards available yet. Generate flashcards from the transcript.",
  };

  return (
    <div className="space-y-6" dir={displayDir}>
      <div className={cn("flex items-center justify-between", displayDir === "rtl" ? "flex-row-reverse" : "")}>
        <h3 className={cn("text-lg font-semibold flex items-center gap-2", displayDir === "rtl" ? "flex-row-reverse" : "")}>
          <Brain className="w-5 h-5 text-primary" />
          {t.studyFlashcards}
        </h3>
        <Badge variant="outline" className="bg-primary/5">{flashcards.length} {t.cards}</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {flashcards.map((card) => (
          <div key={card.id} className="group h-48 w-full [perspective:1000px]" dir={displayDir}>
            <div className="relative h-full w-full rounded-xl shadow-sm transition-all duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
              {/* Front */}
              <div className="absolute inset-0 h-full w-full rounded-xl bg-card border-2 flex flex-col items-center justify-center p-6 text-center [backface-visibility:hidden]" dir={displayDir}>
                <span className="text-xs text-muted-foreground uppercase tracking-wider mb-2">{t.term}</span>
                <h4 className="text-xl font-bold" style={{ textAlign: displayTextAlign }}>{card.term}</h4>
                <p className="absolute bottom-4 text-xs text-muted-foreground/50">{t.hoverToFlip}</p>
              </div>
              
              {/* Back */}
              <div className="absolute inset-0 h-full w-full rounded-xl bg-primary/5 border-2 border-primary/20 flex flex-col items-center justify-center p-6 text-center [transform:rotateY(180deg)] [backface-visibility:hidden]" dir={displayDir}>
                <span className="text-xs text-primary uppercase tracking-wider mb-2">{t.definition}</span>
                <p className="text-sm leading-relaxed font-medium" style={{ textAlign: displayTextAlign }}>{card.definition}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
