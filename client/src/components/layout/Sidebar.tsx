import { Link, useLocation } from "wouter";
import { LayoutDashboard, Video, FolderOpen, Settings, LogOut, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const [location] = useLocation();

  const links = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/history", icon: FolderOpen, label: "My Lectures" },
    { href: "/", icon: PlusCircle, label: "New Analysis" },
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
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                    isActive
                      ? "bg-sidebar-primary/10 text-sidebar-primary"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                >
                  <link.icon size={18} />
                  {link.label}
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-6 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground cursor-pointer transition-colors">
          <Settings size={18} />
          Settings
        </div>
      </div>
    </div>
  );
}
