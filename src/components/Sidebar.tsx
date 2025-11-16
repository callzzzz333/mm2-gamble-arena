import { useNavigate, useLocation } from "react-router-dom";
import {
  Home,
  Menu,
  X,
  Shield,
  TrendingUp,
  Bitcoin,
  ExternalLink,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCryptoPrice } from "@/hooks/useCryptoPrice";
import logo from "@/assets/logo.png";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

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
  const { cryptoData, isLoading } = useCryptoPrice("litecoin");

  const isActive = (path: string) => location.pathname === path;

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) setOpen(false);
  };

  const formatNumber = (num: number) => {
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

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
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Crypto
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="mx-3 p-4 rounded-xl border border-border bg-gradient-to-br from-card to-card/50 backdrop-blur-sm animate-pulse">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-16" />
                <div className="h-3 bg-muted rounded w-20" />
              </div>
            </div>
            <div className="h-6 bg-muted rounded w-24" />
          </div>
        ) : cryptoData ? (
          <div className="mx-3 p-4 rounded-xl border border-border bg-gradient-to-br from-card to-card/50 backdrop-blur-sm space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bitcoin className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{cryptoData.symbol}</p>
                  <p className="text-xs text-muted-foreground">{cryptoData.name}</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-end justify-between">
              <div>
                <p className="text-lg font-bold text-foreground">
                  ${cryptoData.price.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(cryptoData.lastUpdated, { addSuffix: true })}
                </p>
              </div>
              <div className={cn(
                "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded",
                cryptoData.isPositive 
                  ? "bg-green-500/10 text-green-500" 
                  : "bg-red-500/10 text-red-500"
              )}>
                {cryptoData.isPositive ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                {Math.abs(cryptoData.change24h).toFixed(2)}%
              </div>
            </div>

            <div className="pt-3 border-t border-border/50 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">24h High</span>
                <span className="font-medium">${cryptoData.high24h.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">24h Low</span>
                <span className="font-medium">${cryptoData.low24h.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Volume</span>
                <span className="font-medium">{formatNumber(cryptoData.volume24h)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Market Cap</span>
                <span className="font-medium">{formatNumber(cryptoData.marketCap)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-3 p-4 rounded-xl border border-border bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
            <p className="text-xs text-muted-foreground text-center">Failed to load crypto data</p>
          </div>
        )}

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
