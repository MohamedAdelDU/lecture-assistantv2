import { Link, useLocation } from "wouter";
import { LayoutDashboard, Video, FolderOpen, Settings, LogOut, PlusCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function Sidebar() {
  const [location] = useLocation();

  const links = [
    { href: "/", icon: PlusCircle, label: "تحليل جديد" },
    { href: "/dashboard", icon: LayoutDashboard, label: "لوحة المعلومات" },
    { href: "/history", icon: FolderOpen, label: "محاضراتي" },
  ];

  return (
    <div className="w-64 h-screen bg-sidebar border-r border-sidebar-border flex flex-col flex-shrink-0 transition-all duration-300">
      <div className="p-6">
        <div className="flex items-center gap-3 text-sidebar-primary mb-8">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center text-white">
            <Video size={18} strokeWidth={3} />
          </div>
          <span className="font-bold text-lg tracking-tight text-sidebar-foreground">LectureMate</span>
        </div>

        <nav className="space-y-1.5">
          {links.map((link) => {
            const isActive = location === link.href;
            return (
              <Link key={link.href} href={link.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer justify-end",
                    isActive
                      ? "bg-sidebar-primary/10 text-sidebar-primary"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                >
                  <span className="flex-1 text-right">{link.label}</span>
                  <link.icon size={18} />
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-6 border-t border-sidebar-border space-y-4">
        <Link href="/profile">
          <div className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer justify-end",
            location === "/profile" 
              ? "bg-sidebar-primary/10 text-sidebar-primary"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          )}>
            <span className="flex-1 text-right">الإعدادات</span>
            <Settings size={18} />
          </div>
        </Link>
        
        <Link href="/profile">
          <div className="flex items-center gap-3 pt-2 border-t border-sidebar-border/50 cursor-pointer hover:opacity-80 transition-opacity flex-row-reverse">
            <Avatar className="w-9 h-9 border">
              <AvatarImage src="https://github.com/shadcn.png" />
              <AvatarFallback>JD</AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium text-sidebar-foreground">John Doe</span>
              <span className="text-xs text-muted-foreground">خطة برو</span>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
