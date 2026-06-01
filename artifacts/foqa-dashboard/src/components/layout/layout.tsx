import { FC, ReactNode } from "react";
import { Link } from "wouter";
import { PlaneTakeoff, Activity } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

export const Layout: FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground font-sans">
      <header className="flex-none border-b border-border bg-card px-6 py-4 flex items-center justify-between shadow-sm">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="bg-primary/20 p-2 rounded-md">
            <Activity className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight uppercase leading-none">Alvarez Aviation</h1>
            <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest leading-none mt-1">FOQA Dashboard</p>
          </div>
        </Link>
        <div className="flex items-center gap-4 text-sm font-mono text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-normal animate-pulse" />
            <span>SYS ONLINE</span>
          </div>
        </div>
      </header>
      <main className="flex-1 flex flex-col relative">
        {children}
      </main>
    </div>
  );
};
