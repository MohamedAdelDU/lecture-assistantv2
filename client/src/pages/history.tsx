import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { LectureCard } from "@/components/dashboard/LectureCard";
import { Input } from "@/components/ui/input";
import { Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLectures } from "@/hooks/useLectures";
import { lectureService } from "@/lib/lectureService";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

export default function History() {
  const { user } = useAuth();
  const { lectures, isLoading } = useLectures();
  const [searchTerm, setSearchTerm] = useState("");
  const { language } = useLanguage();

  const t = {
    title: language === "ar" ? "محاضراتي" : "My Lectures",
    subtitle:
      language === "ar"
        ? "إدارة ومراجعة المحاضرات التي قمت بتحليلها."
        : "Manage and review your analyzed content.",
    searchPlaceholder:
      language === "ar" ? "ابحث في المحاضرات..." : "Search lectures...",
    loading:
      language === "ar" ? "جاري تحميل المحاضرات..." : "Loading lectures...",
    emptySearch:
      language === "ar"
        ? "لا توجد محاضرات مطابقة لبحثك."
        : "No lectures found matching your search.",
    emptyDefault:
      language === "ar"
        ? "لا توجد محاضرات بعد. ابدأ بتحليل فيديو!"
        : "No lectures yet. Start analyzing a video!",
  };
  
  const filteredLectures = useMemo(() => {
    if (!searchTerm.trim()) {
      return lectures;
    }

    const term = searchTerm.toLowerCase();
    return lectures.filter(
      (lecture) =>
        lecture.title.toLowerCase().includes(term) ||
        lecture.transcript?.toLowerCase().includes(term)
    );
  }, [searchTerm, lectures]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">{t.loading}</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {t.title}
            </h1>
            <p className="text-muted-foreground mt-1">{t.subtitle}</p>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder={t.searchPlaceholder}
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {filteredLectures.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {searchTerm ? t.emptySearch : t.emptyDefault}
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLectures.map((lecture) => (
            <LectureCard key={lecture.id} lecture={lecture} />
          ))}
        </div>
        )}
      </div>
    </AppLayout>
  );
}
