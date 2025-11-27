import { Lecture } from "@/lib/mockData";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Calendar, ArrowRight, PlayCircle, FileText } from "lucide-react";
import { Link } from "wouter";
import { Progress } from "@/components/ui/progress";

interface LectureCardProps {
  lecture: Lecture;
}

export function LectureCard({ lecture }: LectureCardProps) {
  return (
    <Link href={`/lecture/${lecture.id}`}>
      <Card className="overflow-hidden hover:shadow-md transition-all duration-300 cursor-pointer group border-border/60 hover:border-primary/50">
        <div className="relative aspect-video overflow-hidden bg-muted">
          <img 
            src={lecture.thumbnailUrl} 
            alt={lecture.title}
            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
          
          <div className="absolute bottom-3 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded font-mono">
            {lecture.duration}
          </div>
          
          {lecture.status === "processing" && (
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-6 backdrop-blur-sm">
              <div className="w-full max-w-[200px] space-y-2">
                <div className="flex justify-between text-xs text-white font-medium">
                  <span>Processing...</span>
                  <span>{lecture.progress}%</span>
                </div>
                <Progress value={lecture.progress} className="h-2 bg-white/20" />
              </div>
            </div>
          )}
        </div>
        
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <Badge variant={lecture.status === "completed" ? "default" : "secondary"} className="mb-2">
              {lecture.status === "completed" ? "Ready" : "Processing"}
            </Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar size={12} />
              {lecture.date}
            </span>
          </div>
          
          <h3 className="font-semibold text-lg leading-tight mb-2 line-clamp-2 group-hover:text-primary transition-colors">
            {lecture.title}
          </h3>
        </CardContent>
        
        <CardFooter className="p-4 pt-0 flex justify-between items-center text-sm text-muted-foreground">
          <div className="flex gap-3">
            <span className="flex items-center gap-1 text-xs">
              <FileText size={14} /> Transcript
            </span>
            <span className="flex items-center gap-1 text-xs">
              <PlayCircle size={14} /> Quiz
            </span>
          </div>
          <ArrowRight size={16} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-primary" />
        </CardFooter>
      </Card>
    </Link>
  );
}
