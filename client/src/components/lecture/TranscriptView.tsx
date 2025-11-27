import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Download, Copy, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TranscriptViewProps {
  text: string;
}

export function TranscriptView({ text }: TranscriptViewProps) {
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "The transcript has been copied to your clipboard.",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Full Transcript
        </h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy className="w-4 h-4 mr-2" />
            Copy
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>
      
      <div className="bg-card rounded-xl border shadow-sm p-8 font-serif leading-relaxed text-lg text-card-foreground/90 max-w-none">
        {text.split("\n").map((paragraph, i) => (
          <p key={i} className="mb-6 last:mb-0 whitespace-pre-wrap">
            {paragraph}
          </p>
        ))}
      </div>
    </div>
  );
}
