import { Slide } from "@/lib/mockData";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Presentation } from "lucide-react";

interface SlidesViewProps {
  slides: Slide[];
}

export function SlidesView({ slides }: SlidesViewProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Presentation className="w-5 h-5 text-primary" />
          Generated Slides
        </h3>
        <Button>
          <Download className="w-4 h-4 mr-2" />
          Download PowerPoint (.pptx)
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {slides.map((slide) => (
          <Card key={slide.id} className="overflow-hidden hover:shadow-md transition-shadow border-2 border-transparent hover:border-primary/20 group">
            <div className="aspect-video bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 flex flex-col p-6 relative">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-primary" />
              
              <h4 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">
                {slide.title}
              </h4>
              
              <ul className="space-y-2 list-disc pl-4 text-slate-600 dark:text-slate-300 text-sm">
                {slide.content.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>

              <div className="mt-auto pt-4 flex justify-between text-xs text-slate-400">
                <span>LectureMate AI</span>
                <span>{slide.id}</span>
              </div>
            </div>
            <CardContent className="p-3 bg-card border-t">
              <p className="text-xs text-muted-foreground font-medium">Slide {slide.id}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
