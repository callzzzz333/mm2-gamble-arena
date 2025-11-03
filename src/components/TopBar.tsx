import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

export const TopBar = () => {
  return (
    <header className="fixed top-0 left-16 right-0 h-16 bg-background/80 backdrop-blur-lg border-b border-border flex items-center justify-between px-6 z-40">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <span className="text-lg font-bold">M</span>
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            MM2 PVP
          </span>
        </div>
        <nav className="hidden md:flex items-center gap-4 text-sm">
          <a href="/" className="text-foreground/80 hover:text-foreground transition-colors">
            Home
          </a>
          <a href="/marketplace" className="text-foreground/60 hover:text-foreground transition-colors">
            Marketplace
          </a>
          <a href="/leaderboard" className="text-foreground/60 hover:text-foreground transition-colors">
            Leaderboard
          </a>
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="w-5 h-5" />
        </Button>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 shadow-glow">
          LOGIN
        </Button>
      </div>
    </header>
  );
};
