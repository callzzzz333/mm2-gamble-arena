import { useNavigate, useLocation } from "react-router-dom";
import {
  Home,
  Menu,
  X,
  Shield,
  TrendingUp,
  Coins,
  ExternalLink,
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

  const cryptoCoins = [
    { name: "Bitcoin", symbol: "BTC" },
    { name: "Ethereum", symbol: "ETH" },
    { name: "Litecoin", symbol: "LTC" },
    { name: "USDT", symbol: "USDT" },
    { name: "BNB", symbol: "BNB" },
  ];

  const gameItems = [
    { title: "SAB", path: "/items?game=sab" },
    { title: "PVB", path: "/items?game=pvb" },
    { title: "GAG", path: "/items?game=gag" },
    { title: "MM2", path: "/items?game=mm2" },
    { title: "ADM", path: "/items?game=adm" },
  ];

  const sidebarContent = (
    <>
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

        <div className="py-4">
          <div className="px-3 mb-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Coins className="w-4 h-4" />
              Crypto Statistics
            </p>
          </div>
        </div>

        {cryptoCoins.map((coin) => (
          <div
            key={coin.symbol}
            className="w-full px-3 py-2 rounded-lg border border-border bg-card/50 mb-1 flex items-center justify-between"
          >
            <span className="text-sm font-medium">{coin.name}</span>
            <span className="text-xs text-muted-foreground">{coin.symbol}</span>
          </div>
        ))}

        <div className="py-4">
          <div className="px-3 mb-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Game Item Values
            </p>
          </div>
        </div>

        {gameItems.map((item) => (
          <Button
            key={item.title}
            variant="ghost"
            className={cn(
              "w-full justify-start gap-3 h-11 px-3 rounded-lg transition-all relative border border-border",
              isActive(item.path)
                ? "bg-accent text-accent-foreground shadow-[0_0_15px_hsl(var(--glow-primary)/0.4)]"
                : "hover:bg-accent/50 hover:shadow-[0_0_10px_hsl(var(--glow-primary)/0.2)]",
            )}
            onClick={() => handleNavigation(item.path)}
          >
            <span className="font-bold text-lg">{item.title}</span>
          </Button>
        ))}

        <Button
          variant="ghost"
          className="w-full justify-start gap-3 h-11 px-3 rounded-lg transition-all border border-border hover:bg-accent/50 hover:shadow-[0_0_10px_hsl(var(--glow-primary)/0.2)] mt-2"
          onClick={() => window.open("https://www.rolimons.com/", "_blank")}
        >
          <ExternalLink className="w-5 h-5" />
          <span className="font-medium">Rolimons Stats</span>
        </Button>

        {isAdmin && (
          <>
            <div className="py-4">
              <div className="h-px bg-border" />
            </div>

            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3 h-11 px-3 rounded-lg transition-all border border-border",
                isActive("/admin")
                  ? "bg-destructive/20 text-destructive shadow-[0_0_15px_hsl(var(--destructive)/0.4)]"
                  : "hover:bg-destructive/10 hover:shadow-[0_0_10px_hsl(var(--destructive)/0.2)]",
              )}
              onClick={() => handleNavigation("/admin")}
            >
              <Shield className="w-5 h-5" />
              <span className="font-medium">Admin Panel</span>
            </Button>
          </>
        )}
      </div>
    </>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="fixed top-4 left-4 z-50 lg:hidden"
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex flex-col h-full py-6 overflow-y-auto">
            {sidebarContent}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 border-r bg-card flex-col py-6 overflow-y-auto z-40">
      {sidebarContent}
    </aside>
  );
};
