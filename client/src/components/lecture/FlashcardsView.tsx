import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Brain, Target, Clock } from "lucide-react";

interface Flashcard {
  id: number;
  term: string;
  definition: string;
}

const MOCK_FLASHCARDS: Flashcard[] = [
  { id: 1, term: "Wave Function (Ψ)", definition: "A mathematical description of the quantum state of an isolated quantum system." },
  { id: 2, term: "Superposition", definition: "The ability of a quantum system to be in multiple states at the same time until it is measured." },
  { id: 3, term: "Heisenberg Uncertainty Principle", definition: "It is impossible to measure the position and momentum of a particle with absolute precision simultaneously." },
  { id: 4, term: "Quantum Entanglement", definition: "A phenomenon where particles become interconnected and the state of one instantly influences the state of the other, regardless of distance." }
];

export function FlashcardsView() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          Study Flashcards
        </h3>
        <Badge variant="outline" className="bg-primary/5">4 Cards</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MOCK_FLASHCARDS.map((card) => (
          <div key={card.id} className="group h-48 w-full [perspective:1000px]">
            <div className="relative h-full w-full rounded-xl shadow-sm transition-all duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
              {/* Front */}
              <div className="absolute inset-0 h-full w-full rounded-xl bg-card border-2 flex flex-col items-center justify-center p-6 text-center [backface-visibility:hidden]">
                <span className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Term</span>
                <h4 className="text-xl font-bold">{card.term}</h4>
                <p className="absolute bottom-4 text-xs text-muted-foreground/50">Hover to flip</p>
              </div>
              
              {/* Back */}
              <div className="absolute inset-0 h-full w-full rounded-xl bg-primary/5 border-2 border-primary/20 flex flex-col items-center justify-center p-6 text-center [transform:rotateY(180deg)] [backface-visibility:hidden]">
                <span className="text-xs text-primary uppercase tracking-wider mb-2">Definition</span>
                <p className="text-sm leading-relaxed font-medium">{card.definition}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
