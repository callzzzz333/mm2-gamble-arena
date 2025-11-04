import { useNavigate, useLocation } from "react-router-dom";
import { Home, Trophy, DollarSign, Shield, Coins, Dices, Zap, Gift, Swords, Star, CircleDot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

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
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    setIsAdmin(!!data);
  };

  const isActive = (path: string) => location.pathname === path;

  const gameMenuItems: GameMenuItem[] = [
    { title: "Coinflip", icon: Coins, path: "/coinflip", isNew: true },
    { title: "Jackpot", icon: Trophy, path: "/jackpot", isNew: true },
    { title: "1v1 Battle", icon: Swords, path: "/battle" },
    { title: "Upgrader", icon: Zap, path: "/upgrader" },
    { title: "Dice Duel", icon: Dices, comingSoon: true },
    { title: "Mystery Box", icon: Gift, comingSoon: true },
    { title: "Wheel", icon: CircleDot, comingSoon: true },
  ];

  return (
    <div className="fixed left-0 top-0 bottom-0 w-64 bg-card border-r border-border flex flex-col py-6 z-50 overflow-y-auto scrollbar-hide">
      {/* Logo */}
      <div 
        className="px-6 mb-8 cursor-pointer flex items-center gap-3"
        onClick={() => navigate("/")}
      >
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow">
          <Trophy className="w-6 h-6" />
        </div>
        <span className="text-xl font-bold">MM2 PVP</span>
      </div>

      {/* Navigation */}
      <div className="flex-1 space-y-1 px-3">
        <Button 
          variant="ghost" 
          className={cn(
            "w-full justify-start gap-3 h-11 px-3 rounded-lg transition-all",
            isActive("/") ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
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
              "w-full justify-start gap-3 h-11 px-3 rounded-lg transition-all relative",
              item.path && isActive(item.path) 
                ? "bg-accent text-accent-foreground" 
                : "hover:bg-accent/50",
              item.comingSoon && "opacity-60 cursor-not-allowed"
            )}
            onClick={() => item.path && !item.comingSoon && navigate(item.path)}
            disabled={item.comingSoon}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium flex-1 text-left">{item.title}</span>
            {item.isNew && (
              <span className="px-1.5 py-0.5 bg-primary text-[10px] font-bold rounded uppercase">
                New
              </span>
            )}
            {item.comingSoon && (
              <span className="px-1.5 py-0.5 bg-muted text-[10px] font-bold rounded uppercase">
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
            "w-full justify-start gap-3 h-11 px-3 rounded-lg transition-all",
            isActive("/deposit") ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
          )}
          onClick={() => navigate("/deposit")}
        >
          <DollarSign className="w-5 h-5" />
          <span className="font-medium">Deposit Items</span>
        </Button>

        {isAdmin && (
          <Button 
            variant="ghost" 
            className={cn(
              "w-full justify-start gap-3 h-11 px-3 rounded-lg transition-all",
              isActive("/admin") ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
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
          © 2024 MM2 PVP
        </p>
      </div>
    </div>
  );
};
