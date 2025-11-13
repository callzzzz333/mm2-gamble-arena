import { useNavigate, useLocation } from "react-router-dom";
import {
  Home,
  Trophy,
  DollarSign,
  Shield,
  Coins,
  Dices,
  Zap,
  Gift,
  Star,
  CircleDot,
  Percent,
  Skull,
  Crown,
  Target,
  Users,
  Ticket,
  TrendingUp,
  Swords,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { useIsMobile } from "@/hooks/use-mobile";
import logo from "@/assets/logo.png";
import { useState } from "react";

interface GameMenuItem {
  title: string;
  icon: React.ElementType;
  path?: string;
  isNew?: boolean;
  comingSoon?: boolean;
}

export const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth(false);
  const { isAdmin } = useAdminCheck(user);
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) setOpen(false);
  };

  const gameMenuItems: GameMenuItem[] = [
    { title: "Coinflip", icon: Coins, path: "/coinflip", isNew: true },
    { title: "Jackpot", icon: Trophy, path: "/jackpot", isNew: true },
    { title: "Upgrader", icon: TrendingUp, path: "/upgrader", isNew: true },
    { title: "Roulette", icon: CircleDot, path: "/roulette", isNew: true },
    { title: "Crash", icon: Zap, path: "/crash", isNew: true },
    { title: "Case Battles", icon: Swords, path: "/case-battles", isNew: true },
  ];

  const sidebarContent = (
    <>
      {/* Logo */}
      <div
        className="px-6 mb-8 cursor-pointer flex items-center justify-center relative group"
        onClick={() => handleNavigation("/")}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-white/5 to-blue-500/10 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
        <img
          src={logo}
          alt="Royale Logo"
          className="h-16 w-auto relative z-10 group-hover:scale-105 transition-transform"
        />
      </div>

      {/* Navigation */}
      <div className="flex-1 space-y-1 px-3">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3 h-11 px-3 rounded-lg transition-all border border-border",
            isActive("/")
              ? "bg-accent text-accent-foreground shadow-[0_0_15px_hsl(var(--glow-primary)/0.4)]"
              : "hover:bg-accent/50 hover:shadow-[0_0_10px_hsl(var(--glow-primary)/0.2)]",
          )}
          onClick={() => handleNavigation("/")}
        >
          <Home className="w-5 h-5" />
          <span className="font-medium">Home</span>
        </Button>

        {/* Divider */}
        <div className="py-4">
          <div className="px-3 mb-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Game Modes</p>
          </div>
        </div>

        {/* Game Modes */}
        {gameMenuItems.map((item) => (
          <Button
            key={item.title}
            variant="ghost"
            className={cn(
              "w-full justify-start gap-3 h-11 px-3 rounded-lg transition-all relative border border-border",
              item.path && isActive(item.path)
                ? "bg-accent text-accent-foreground shadow-[0_0_15px_hsl(var(--glow-primary)/0.4)]"
                : "hover:bg-accent/50 hover:shadow-[0_0_10px_hsl(var(--glow-primary)/0.2)]",
              item.comingSoon && "opacity-60 cursor-not-allowed",
            )}
            onClick={() => item.path && !item.comingSoon && handleNavigation(item.path)}
            disabled={item.comingSoon}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium flex-1 text-left">{item.title}</span>
            {item.isNew && (
              <span className="px-1.5 py-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded uppercase">
                New
              </span>
            )}
            {item.comingSoon && (
              <span className="px-1.5 py-0.5 bg-muted text-muted-foreground text-[10px] font-bold rounded uppercase">
                Soon
              </span>
            )}
          </Button>
        ))}

        {/* Divider */}
        <div className="py-4">
          <div className="h-px bg-border" />
        </div>

        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3 h-11 px-3 rounded-lg transition-all border border-border",
            isActive("/leaderboard")
              ? "bg-accent text-accent-foreground shadow-[0_0_15px_hsl(var(--glow-primary)/0.4)]"
              : "hover:bg-accent/50 hover:shadow-[0_0_10px_hsl(var(--glow-primary)/0.2)]",
          )}
          onClick={() => handleNavigation("/leaderboard")}
        >
          <Target className="w-5 h-5" />
          <span className="font-medium">Leaderboard</span>
        </Button>

        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3 h-11 px-3 rounded-lg transition-all relative border border-border",
            isActive("/rewards")
              ? "bg-accent text-accent-foreground shadow-[0_0_15px_hsl(var(--glow-primary)/0.4)]"
              : "hover:bg-accent/50 hover:shadow-[0_0_10px_hsl(var(--glow-primary)/0.2)]",
          )}
          onClick={() => handleNavigation("/rewards")}
        >
          <Gift className="w-5 h-5" />
          <span className="font-medium flex-1 text-left">Daily Rewards</span>
          <span className="px-1.5 py-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded uppercase">
            New
          </span>
        </Button>

        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3 h-11 px-3 rounded-lg transition-all border border-border",
            isActive("/christmas-raffle")
              ? "bg-accent text-accent-foreground shadow-[0_0_15px_hsl(var(--glow-primary)/0.4)]"
              : "hover:bg-accent/50 hover:shadow-[0_0_10px_hsl(var(--glow-primary)/0.2)]",
          )}
          onClick={() => handleNavigation("/christmas-raffle")}
        >
          <CircleDot className="w-5 h-5 text-primary" />
          <span className="font-medium flex-1 text-left">Christmas Raffle</span>
        </Button>

        {/* Divider */}
        <div className="py-4">
          <div className="h-px bg-border" />
        </div>

        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3 h-11 px-3 rounded-lg transition-all border border-border",
            isActive("/items")
              ? "bg-accent text-accent-foreground shadow-[0_0_15px_hsl(var(--glow-primary)/0.4)]"
              : "hover:bg-accent/50 hover:shadow-[0_0_10px_hsl(var(--glow-primary)/0.2)]",
          )}
          onClick={() => handleNavigation("/items")}
        >
          <Star className="w-5 h-5" />
          <span className="font-medium">Item Values</span>
        </Button>

        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3 h-11 px-3 rounded-lg transition-all border border-border",
            isActive("/deposit")
              ? "bg-accent text-accent-foreground shadow-[0_0_15px_hsl(var(--glow-primary)/0.4)]"
              : "hover:bg-accent/50 hover:shadow-[0_0_10px_hsl(var(--glow-primary)/0.2)]",
          )}
          onClick={() => handleNavigation("/deposit")}
        >
          <DollarSign className="w-5 h-5" />
          <span className="font-medium">Deposit</span>
        </Button>

        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3 h-11 px-3 rounded-lg transition-all border border-border",
            isActive("/withdraw")
              ? "bg-accent text-accent-foreground shadow-[0_0_15px_hsl(var(--glow-primary)/0.4)]"
              : "hover:bg-accent/50 hover:shadow-[0_0_10px_hsl(var(--glow-primary)/0.2)]",
          )}
          onClick={() => handleNavigation("/withdraw")}
        >
          <DollarSign className="w-5 h-5" />
          <span className="font-medium">Withdraw</span>
        </Button>

        {isAdmin && (
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start gap-3 h-11 px-3 rounded-lg transition-all border border-border",
              isActive("/admin")
                ? "bg-accent text-accent-foreground shadow-[0_0_15px_hsl(var(--glow-primary)/0.4)]"
                : "hover:bg-accent/50 hover:shadow-[0_0_10px_hsl(var(--glow-primary)/0.2)]",
            )}
            onClick={() => handleNavigation("/admin")}
          >
            <Shield className="w-5 h-5" />
            <span className="font-medium">Admin Panel</span>
          </Button>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">© 2024 RBXROYALE</p>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="fixed left-4 top-4 z-50 md:hidden"
            >
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="flex flex-col h-full py-6 overflow-y-auto scrollbar-hide">
              {sidebarContent}
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <div className="fixed left-0 top-0 bottom-0 w-64 bg-card border-r border-border flex flex-col py-6 z-50 overflow-y-auto scrollbar-hide">
      {sidebarContent}
    </div>
  );
};
