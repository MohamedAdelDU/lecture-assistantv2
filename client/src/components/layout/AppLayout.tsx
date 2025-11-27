import { Sidebar } from "./Sidebar";
import { ReactNode } from "react";

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background font-sans">
      <Sidebar />
      <main className="flex-1 overflow-y-auto h-screen">
        <div className="max-w-6xl mx-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
