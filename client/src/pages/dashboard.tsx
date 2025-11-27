import { AppLayout } from "@/components/layout/AppLayout";
import { LectureCard } from "@/components/dashboard/LectureCard";
import { MOCK_LECTURES } from "@/lib/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Clock, BookOpen, Brain, Sparkles, TrendingUp } from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  const recentLectures = MOCK_LECTURES.slice(0, 2);
  const inProgressLecture = MOCK_LECTURES.find(l => l.status === "processing") || MOCK_LECTURES[0];

  const stats = [
    { title: "Total Lectures", value: "12", icon: BookOpen, color: "text-blue-500", bg: "bg-blue-500/10" },
    { title: "Quiz Average", value: "85%", icon: TrendingUp, color: "text-green-500", bg: "bg-green-500/10" },
    { title: "Study Time", value: "14h 20m", icon: Clock, color: "text-violet-500", bg: "bg-violet-500/10" },
    { title: "Cards Created", value: "156", icon: Brain, color: "text-amber-500", bg: "bg-amber-500/10" },
  ];

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Welcome back, John! 👋</h1>
            <p className="text-muted-foreground mt-1">Here's what's happening with your learning today.</p>
          </div>
          <Link href="/">
            <Button className="bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Sparkles className="w-4 h-4 mr-2" />
              Analyze New Lecture
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, i) => (
            <Card key={i} className="border shadow-sm">
              <CardContent className="p-6 flex flex-col items-center text-center space-y-2">
                <div className={`p-3 rounded-full ${stat.bg} ${stat.color} mb-2`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <span className="text-2xl font-bold">{stat.value}</span>
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{stat.title}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Continue Learning Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Continue Learning
            </h2>
          </div>
          <div className="bg-card border rounded-xl p-6 flex flex-col md:flex-row gap-6 items-center shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
            <div className="relative w-full md:w-64 aspect-video rounded-lg overflow-hidden flex-shrink-0">
              <img 
                src={inProgressLecture.thumbnailUrl} 
                alt={inProgressLecture.title}
                className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
              <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
                {inProgressLecture.duration}
              </div>
            </div>
            <div className="flex-1 space-y-3 w-full">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded uppercase">In Progress</span>
                <span className="text-xs text-muted-foreground">Last viewed 2 hours ago</span>
              </div>
              <h3 className="text-xl font-bold leading-tight group-hover:text-primary transition-colors">
                {inProgressLecture.title}
              </h3>
              <p className="text-muted-foreground text-sm line-clamp-2">
                Pick up where you left off. You've completed 65% of the analysis review.
              </p>
              <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                <div className="bg-primary h-full w-[65%]" />
              </div>
            </div>
            <Button size="lg" className="shrink-0 w-full md:w-auto">
              Continue
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </section>

        {/* Recent Activity */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Recent Uploads</h2>
            <Link href="/history">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
                View All
                <ArrowRight className="ml-1 w-4 h-4" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {recentLectures.map((lecture) => (
              <LectureCard key={lecture.id} lecture={lecture} />
            ))}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
