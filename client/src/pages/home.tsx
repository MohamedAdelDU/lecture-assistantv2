import { useState } from "react";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Youtube, Sparkles, Search, Upload, Mic } from "lucide-react";
import { motion } from "framer-motion";
import generatedImage from '@assets/generated_images/abstract_visualization_of_knowledge_and_learning.png';

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
      <div className="max-w-4xl mx-auto space-y-16 py-12">
        
        {/* Hero Section */}
        <section className="text-center space-y-6 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[100px] -z-10" />
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="outline" className="mb-4 px-4 py-1 text-sm border-primary/30 text-primary bg-primary/5">
              <Sparkles className="w-3 h-3 mr-2" />
              AI-Powered Learning Assistant
            </Badge>
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-foreground mb-6">
              Turn Lectures into <br />
              <span className="text-primary bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">
                Actionable Knowledge
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Paste a YouTube link and get instant transcripts, summaries, quizzes, and slides. Stop pausing, start learning.
            </p>
          </motion.div>

          {/* Input Area */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="max-w-2xl mx-auto mt-10"
          >
            <Card className="border-2 shadow-lg shadow-primary/5">
              <CardContent className="p-2">
                <form onSubmit={handleAnalyze} className="flex gap-2">
                  <div className="relative flex-1">
                    <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 text-red-500 w-5 h-5" />
                    <Input 
                      placeholder="Paste YouTube URL here..." 
                      className="pl-10 h-12 text-base border-transparent bg-transparent shadow-none focus-visible:ring-0"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                    />
                  </div>
                  <Button size="lg" type="submit" className="h-12 px-8 text-base" disabled={isAnalyzing}>
                    {isAnalyzing ? "Analyzing..." : "Start Learning"}
                    {!isAnalyzing && <ArrowRight className="ml-2 w-4 h-4" />}
                  </Button>
                </form>
              </CardContent>
            </Card>
            <div className="flex justify-center gap-6 mt-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1 hover:text-foreground cursor-pointer transition-colors">
                <Upload className="w-3 h-3" /> Upload Video
              </span>
              <span className="flex items-center gap-1 hover:text-foreground cursor-pointer transition-colors">
                <Mic className="w-3 h-3" /> Record Audio
              </span>
            </div>
          </motion.div>
        </section>

        {/* Features Grid */}
        <section className="grid md:grid-cols-3 gap-8">
          {[
            {
              title: "Smart Summaries",
              desc: "Get the gist in seconds with AI-generated bullet points and key takeaways.",
              icon: "📝"
            },
            {
              title: "Interactive Quizzes",
              desc: "Test your knowledge immediately with auto-generated multiple choice questions.",
              icon: "🧠"
            },
            {
              title: "Ready-to-use Slides",
              desc: "Download a presentation deck based on the lecture structure instantly.",
              icon: "📊"
            }
          ].map((feature, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 + (i * 0.1) }}
            >
              <Card className="h-full hover:border-primary/50 transition-colors group cursor-default">
                <CardContent className="p-6">
                  <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">{feature.icon}</div>
                  <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </section>

        {/* Visual Element */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="rounded-2xl overflow-hidden border shadow-2xl"
        >
           <img src={generatedImage} alt="App interface preview" className="w-full h-auto object-cover opacity-90" />
        </motion.div>

      </div>
    </AppLayout>
  );
}
