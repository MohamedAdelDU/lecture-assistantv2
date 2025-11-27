import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

export function FeatureShowcase() {
  const [, setLocation] = useLocation();
  const features = [
    {
      title: "Lecture to Flashcards",
      description: "Instantly generate study cards for spaced repetition.",
      gradient: "from-blue-500/20 to-cyan-500/20",
      border: "border-blue-500/20",
      icon: "🗂️",
      link: "/lecture/1"
    },
    {
      title: "Chat with Video",
      description: "Ask questions and get answers directly from the lecture content.",
      gradient: "from-violet-500/20 to-purple-500/20",
      border: "border-violet-500/20",
      icon: "💬",
      link: "/lecture/1"
    },
    {
      title: "Smart Quiz Gen",
      description: "Test your knowledge with AI-generated multiple choice questions.",
      gradient: "from-amber-500/20 to-orange-500/20",
      border: "border-amber-500/20",
      icon: "📝",
      link: "/lecture/1"
    }
  ];

  return (
    <section className="py-12">
      <h2 className="text-2xl font-bold mb-6 text-center">Powerful Learning Tools</h2>
      <div className="grid md:grid-cols-3 gap-6">
        {features.map((feature, i) => (
          <motion.div
            key={i}
            whileHover={{ y: -5 }}
            onClick={() => setLocation(feature.link)}
            className="cursor-pointer"
          >
            <Card className={cn("h-full overflow-hidden border-2 transition-colors hover:border-primary/50", feature.border)}>
              <div className={cn("h-24 bg-gradient-to-br flex items-center justify-center text-4xl", feature.gradient)}>
                {feature.icon}
              </div>
              <CardContent className="p-6">
                <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
