import { useParams } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { MOCK_LECTURES } from "@/lib/mockData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileText, List, HelpCircle, Presentation, Share2, Download, ChevronLeft } from "lucide-react";
import { Link } from "wouter";
import { TranscriptView } from "@/components/lecture/TranscriptView";
import { SummaryView } from "@/components/lecture/SummaryView";
import { QuizView } from "@/components/lecture/QuizView";
import { SlidesView } from "@/components/lecture/SlidesView";
import { FlashcardsView } from "@/components/lecture/FlashcardsView";
import { ChatAssistant } from "@/components/lecture/ChatAssistant";
import { Brain } from "lucide-react";

export default function LectureView() {
  const { id } = useParams();
  const lecture = MOCK_LECTURES.find(l => l.id === id) || MOCK_LECTURES[0];

  return (
    <AppLayout>
      <div className="space-y-6 pb-20">
        {/* Header */}
        <div className="space-y-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="pl-0 hover:bg-transparent text-muted-foreground hover:text-foreground">
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back to Dashboard
            </Button>
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5">
                  {lecture.duration}
                </Badge>
                <span className="text-sm text-muted-foreground">{lecture.date}</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground max-w-3xl">
                {lecture.title}
              </h1>
            </div>
            <div className="flex gap-2">
              <Button variant="outline">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button>
                <Download className="w-4 h-4 mr-2" />
                Export All
              </Button>
            </div>
          </div>
        </div>

        <Separator />

        {/* Main Content */}
        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid w-full grid-cols-5 lg:w-[750px] mb-8">
            <TabsTrigger value="transcript">
              <FileText className="w-4 h-4 mr-2" />
              Transcript
            </TabsTrigger>
            <TabsTrigger value="summary">
              <List className="w-4 h-4 mr-2" />
              Summary
            </TabsTrigger>
            <TabsTrigger value="quiz">
              <HelpCircle className="w-4 h-4 mr-2" />
              Quiz
            </TabsTrigger>
            <TabsTrigger value="slides">
              <Presentation className="w-4 h-4 mr-2" />
              Slides
            </TabsTrigger>
            <TabsTrigger value="flashcards">
              <Brain className="w-4 h-4 mr-2" />
              Cards
            </TabsTrigger>
          </TabsList>

          <div className="min-h-[500px]">
            <TabsContent value="transcript" className="mt-0">
              <TranscriptView text={lecture.transcript || "No transcript available."} />
            </TabsContent>
            
            <TabsContent value="summary" className="mt-0">
              <SummaryView summary={lecture.summary || []} />
            </TabsContent>
            
            <TabsContent value="quiz" className="mt-0">
              <QuizView questions={lecture.questions || []} />
            </TabsContent>
            
            <TabsContent value="slides" className="mt-0">
              <SlidesView slides={lecture.slides || []} />
            </TabsContent>

            <TabsContent value="flashcards" className="mt-0">
              <FlashcardsView />
            </TabsContent>
          </div>
        </Tabs>
      </div>
      <ChatAssistant />
    </AppLayout>
  );
}
