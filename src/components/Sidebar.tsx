import { useNavigate, useLocation } from "react-router-dom";
import { Home, Trophy, DollarSign, Shield, Coins, Dices, Zap, Gift, Swords, Star, CircleDot, Percent, Skull, Crown, Target, Users } from "lucide-react";
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
      {/* Logo */}
      <div 
        className="px-6 mb-8 cursor-pointer flex items-center justify-center"
        onClick={() => navigate("/")}
      >
        <img src={logo} alt="Royale Logo" className="h-16 w-auto" />
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
            "w-full justify-start gap-3 h-11 px-3 rounded-lg transition-all relative border border-blue-500/30 overflow-hidden group",
            isActive("/christmas-raffle") 
              ? "bg-gradient-to-r from-blue-500/20 via-white/10 to-blue-500/20 text-foreground shadow-[0_0_20px_rgba(59,130,246,0.5)]" 
              : "hover:bg-gradient-to-r hover:from-blue-500/10 hover:via-white/5 hover:to-blue-500/10 hover:shadow-[0_0_15px_rgba(59,130,246,0.3)]"
          )}
          onClick={() => navigate("/christmas-raffle")}
        >
          {/* Animated snowflakes background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-2 left-2 text-blue-300/60 animate-[float_3s_ease-in-out_infinite]">❄️</div>
            <div className="absolute top-1/2 right-4 text-white/60 animate-[float_4s_ease-in-out_infinite]" style={{ animationDelay: "1s" }}>❄️</div>
            <div className="absolute -bottom-1 left-1/3 text-blue-400/60 animate-[float_5s_ease-in-out_infinite]" style={{ animationDelay: "2s" }}>❄️</div>
          </div>
          
          <div className="relative flex items-center gap-3 flex-1">
            <Gift className="w-5 h-5 text-blue-500 group-hover:animate-bounce" />
            <span className="font-medium flex-1 text-left bg-gradient-to-r from-blue-400 via-white to-blue-400 bg-clip-text text-transparent animate-pulse">
              🎟️ Christmas Raffle
            </span>
            <span className="px-1.5 py-0.5 bg-gradient-to-r from-blue-500 to-white text-primary-foreground text-[10px] font-bold rounded uppercase animate-pulse">
              🎫 Live
            </span>
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
