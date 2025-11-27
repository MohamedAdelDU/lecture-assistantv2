import { useState } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Youtube, Sparkles, Upload, Mic, Star } from "lucide-react";
import { motion } from "framer-motion";
import generatedImage from '@assets/generated_images/abstract_visualization_of_knowledge_and_learning.png';
import { FeatureShowcase } from "@/components/home/FeatureShowcase";

export default function Home() {
  const [, setLocation] = useLocation();
  const [url, setUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    
    setIsAnalyzing(true);
    
    // Simulate processing delay before redirect
    setTimeout(() => {
      // In a real app, we'd create the resource first.
      // Here we just go to a mock ID.
      setLocation("/lecture/1"); 
    }, 1500);
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-20 py-12">
        
        {/* Hero Section */}
        <section className="text-center space-y-8 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] -z-10" />
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-4"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20 mb-4">
              <Star className="w-3.5 h-3.5 fill-primary" />
              <span>New: Flashcard Generation Available</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground leading-tight">
              Master Any Subject <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-500 to-blue-600">
                In Half The Time
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              The all-in-one AI study companion. Convert lectures into summaries, quizzes, flashcards, and slides instantly.
            </p>
          </motion.div>

          {/* Input Area */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="max-w-2xl mx-auto mt-10"
          >
            <Card className="border-2 shadow-xl shadow-primary/10 overflow-hidden">
              <CardContent className="p-2">
                <form onSubmit={handleAnalyze} className="flex gap-2">
                  <div className="relative flex-1">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 px-2 py-1 bg-red-50 text-red-600 rounded text-xs font-bold border border-red-100">
                      <Youtube className="w-3 h-3" />
                      YouTube
                    </div>
                    <Input 
                      placeholder="Paste video URL here..." 
                      className="pl-28 h-14 text-lg border-transparent bg-transparent shadow-none focus-visible:ring-0"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                    />
                  </div>
                  <Button size="lg" type="submit" className="h-14 px-8 text-base font-semibold shadow-lg shadow-primary/20" disabled={isAnalyzing}>
                    {isAnalyzing ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Sparkles className="w-5 h-5" />
                      </motion.div>
                    ) : (
                      <>
                        Analyze Now
                        <ArrowRight className="ml-2 w-5 h-5" />
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
            
            <div className="flex justify-center gap-8 mt-6 text-sm font-medium text-muted-foreground">
              <button className="flex items-center gap-2 hover:text-primary transition-colors group">
                <div className="p-2 bg-secondary rounded-full group-hover:bg-primary/10 transition-colors">
                  <Upload className="w-4 h-4" />
                </div>
                Upload File
              </button>
              <button className="flex items-center gap-2 hover:text-primary transition-colors group">
                <div className="p-2 bg-secondary rounded-full group-hover:bg-primary/10 transition-colors">
                  <Mic className="w-4 h-4" />
                </div>
                Record Audio
              </button>
            </div>
          </motion.div>
        </section>

        <FeatureShowcase />

        {/* How it Works Section */}
        <section className="py-12 border-t border-b border-border/50 bg-secondary/5 -mx-8 px-8">
          <div className="max-w-4xl mx-auto text-center space-y-12">
            <div className="space-y-4">
              <h2 className="text-3xl font-bold tracking-tight">How It Works</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Three simple steps to transform your learning experience.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                { step: "01", title: "Paste URL", desc: "Copy any YouTube lecture link and paste it into our analyzer." },
                { step: "02", title: "AI Processing", desc: "Our AI extracts transcripts, generates summaries, and creates quizzes." },
                { step: "03", title: "Start Learning", desc: "Review the summary, take the quiz, and master the material." }
              ].map((item, i) => (
                <div key={i} className="relative p-6 rounded-2xl bg-background border shadow-sm">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground font-bold text-sm py-1 px-3 rounded-full">
                    {item.step}
                  </div>
                  <h3 className="font-bold text-lg mt-4 mb-2">{item.title}</h3>
                  <p className="text-muted-foreground text-sm">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Visual Element */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.4 }}
          className="rounded-2xl overflow-hidden border-4 border-white/20 shadow-2xl mx-auto max-w-4xl bg-black"
        >
           <div className="relative aspect-video">
             <img src={generatedImage} alt="App interface preview" className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity duration-700" />
             <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent pointer-events-none" />
             <div className="absolute bottom-8 left-8 right-8 text-center">
               <p className="text-white/90 text-lg font-medium">"LectureMate transformed how I study for finals. I saved 10+ hours per week."</p>
               <p className="text-white/60 text-sm mt-2">— Sarah K., Medical Student</p>
             </div>
           </div>
        </motion.div>

      </div>
    </AppLayout>
  );
}
