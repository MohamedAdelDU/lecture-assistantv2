import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Share2, Sparkles } from "lucide-react";

interface SummaryViewProps {
  summary: string[];
}

export function SummaryView({ summary }: SummaryViewProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          AI Summary
        </h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Save Summary
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {summary.map((point, index) => (
          <Card key={index} className="border-l-4 border-l-primary/40 hover:border-l-primary transition-colors">
            <CardContent className="p-4 flex gap-4">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0">
                {index + 1}
              </span>
              <p className="text-base leading-relaxed pt-1">{point}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="bg-primary/5 rounded-xl p-6 mt-8 border border-primary/10">
        <h4 className="font-semibold mb-2 text-primary">Key Takeaways</h4>
        <p className="text-sm text-muted-foreground">
          This lecture primarily focuses on the probabilistic nature of quantum mechanics, contrasting it with classical determinism. The central mathematical object is the Wave Function (Ψ), whose squared modulus |Ψ|² represents probability density.
        </p>
      </div>
    </div>
  );
}
