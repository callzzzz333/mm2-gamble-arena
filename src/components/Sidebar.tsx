import { useNavigate, useLocation } from "react-router-dom";
import { Home, Trophy, DollarSign, Shield, Coins, Dices, Zap, Gift, Swords, Star, CircleDot, Percent, Skull, Crown, Target, Users, Snowflake, Ticket, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import logo from "@/assets/logo.png";

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

  const isActive = (path: string) => location.pathname === path;

  const gameMenuItems: GameMenuItem[] = [
    { title: "Coinflip", icon: Coins, path: "/coinflip", isNew: true },
    { title: "Jackpot", icon: Trophy, path: "/jackpot", isNew: true },
    { title: "Case Battles", icon: Swords, path: "/case-battles", isNew: true },
  ];

  return (
    <div className="fixed left-0 top-0 bottom-0 w-64 bg-card border-r border-border flex flex-col py-6 z-50 overflow-y-auto scrollbar-hide">
      {/* Logo with Christmas effects */}
      <div 
        className="px-6 mb-8 cursor-pointer flex items-center justify-center relative group"
        onClick={() => navigate("/")}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-white/5 to-blue-500/10 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative">
          <img src={logo} alt="Royale Logo" className="h-16 w-auto relative z-10 group-hover:scale-105 transition-transform" />
          <Snowflake className="absolute -top-2 -right-2 w-5 h-5 text-blue-400 animate-float opacity-80" />
          <Snowflake className="absolute -bottom-2 -left-2 w-4 h-4 text-white/60 animate-float" style={{ animationDelay: "1.5s" }} />
          <Sparkles className="absolute top-0 left-0 w-3 h-3 text-yellow-300/70 animate-pulse" />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 space-y-1 px-3">
        <Button 
          variant="ghost" 
          className={cn(
            "w-full justify-start gap-3 h-11 px-3 rounded-lg transition-all border border-border",
            isActive("/") 
              ? "bg-accent text-accent-foreground shadow-[0_0_15px_hsl(var(--glow-primary)/0.4)]" 
              : "hover:bg-accent/50 hover:shadow-[0_0_10px_hsl(var(--glow-primary)/0.2)]"
          )}
          onClick={() => navigate("/")}
        >
          <Home className="w-5 h-5" />
          <span className="font-medium">Home</span>
        </Button>

        {/* Divider */}
        <div className="py-4">
          <div className="px-3 mb-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Game Modes
            </p>
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
              item.comingSoon && "opacity-60 cursor-not-allowed"
            )}
            onClick={() => item.path && !item.comingSoon && navigate(item.path)}
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
              : "hover:bg-accent/50 hover:shadow-[0_0_10px_hsl(var(--glow-primary)/0.2)]"
          )}
          onClick={() => navigate("/leaderboard")}
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
              : "hover:bg-accent/50 hover:shadow-[0_0_10px_hsl(var(--glow-primary)/0.2)]"
          )}
          onClick={() => navigate("/rewards")}
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
            "w-full justify-start gap-3 h-11 px-3 rounded-lg transition-all relative border-2 overflow-hidden group",
            isActive("/christmas-raffle") 
              ? "bg-gradient-to-r from-blue-500/30 via-white/20 to-blue-500/30 text-foreground shadow-[0_0_25px_rgba(59,130,246,0.6)] border-blue-400/50" 
              : "border-blue-500/30 hover:bg-gradient-to-r hover:from-blue-500/20 hover:via-white/10 hover:to-blue-500/20 hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]"
          )}
          onClick={() => navigate("/christmas-raffle")}
        >
          {/* Animated shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          
          {/* Animated snowflakes background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <Snowflake className="absolute -top-2 left-2 w-3 h-3 text-blue-300/80 animate-float" />
            <Snowflake className="absolute top-1/2 right-4 w-4 h-4 text-white/70 animate-float" style={{ animationDelay: "1s" }} />
            <Snowflake className="absolute -bottom-1 left-1/3 w-3 h-3 text-blue-400/80 animate-float" style={{ animationDelay: "2s" }} />
            <Sparkles className="absolute top-2 right-8 w-3 h-3 text-yellow-300/60 animate-pulse" />
          </div>
          
          {/* Glowing orbs */}
          <div className="absolute top-0 left-0 w-20 h-20 bg-blue-500/20 rounded-full blur-2xl animate-pulse" />
          <div className="absolute bottom-0 right-0 w-16 h-16 bg-white/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: "1s" }} />
          
          <div className="relative flex items-center gap-3 flex-1 z-10">
            <div className="relative">
              <Gift className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
              <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-yellow-300 animate-pulse opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="font-bold flex-1 text-left bg-gradient-to-r from-blue-300 via-white to-blue-300 bg-clip-text text-transparent flex items-center gap-2">
              <Ticket className="w-4 h-4 text-blue-400" />
              Christmas Raffle
            </span>
            <div className="relative">
              <span className="px-2 py-1 bg-gradient-to-r from-blue-500 via-blue-400 to-blue-500 text-white text-[10px] font-bold rounded-full uppercase flex items-center gap-1 shadow-lg animate-pulse">
                <Ticket className="w-3 h-3" />
                Live
              </span>
              <div className="absolute inset-0 bg-blue-400 rounded-full blur-md opacity-50 animate-pulse" />
            </div>
          </div>
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
              : "hover:bg-accent/50 hover:shadow-[0_0_10px_hsl(var(--glow-primary)/0.2)]"
          )}
          onClick={() => navigate("/items")}
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
              : "hover:bg-accent/50 hover:shadow-[0_0_10px_hsl(var(--glow-primary)/0.2)]"
          )}
          onClick={() => navigate("/deposit")}
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
              : "hover:bg-accent/50 hover:shadow-[0_0_10px_hsl(var(--glow-primary)/0.2)]"
          )}
          onClick={() => navigate("/withdraw")}
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
                : "hover:bg-accent/50 hover:shadow-[0_0_10px_hsl(var(--glow-primary)/0.2)]"
            )}
            onClick={() => navigate("/admin")}
          >
            <Shield className="w-5 h-5" />
            <span className="font-medium">Admin Panel</span>
          </Button>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 pt-4 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          © 2024 RBXROYALE
        </p>
      </div>
    </div>
  );
};
