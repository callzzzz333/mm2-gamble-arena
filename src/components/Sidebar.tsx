// Updated Sidebar with polished buttons, enhanced layering, glow effects, depth, and improved micro‑interactions.
// NOTE: Only the button styles and layering details have been upgraded — logic unchanged.

import { useNavigate, useLocation } from "react-router-dom";
import { Home, Menu, X, Shield, TrendingUp, ExternalLink, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCryptoPrice } from "@/hooks/useCryptoPrice";
import logo from "@/assets/logo.png";
import litecoinLogo from "@/assets/litecoin-logo.png";
import { useState } from "react";

export const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth(false);
  const { isAdmin } = useAdminCheck(user);
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  // Fetch Litecoin price every second for realtime updates
  const { cryptoData, isLoading, refetch } = useCryptoPrice("litecoin");

  // Re-fetch every 1 second
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 1000);

    return () => clearInterval(interval);
  }, [refetch]);

  const isActive = (path) => location.pathname === path;
  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) setOpen(false);
  };

  const gameItems = [
    { title: "SAB", path: "/items?game=sab" },
    { title: "PVB", path: "/items?game=pvb" },
    { title: "GAG", path: "/items?game=gag" },
    { title: "MM2", path: "/items?game=mm2" },
    { title: "ADM", path: "/items?game=adm" },
  ];

  const buttonBase =
    "w-full justify-start h-12 px-4 rounded-xl transition-all border border-border relative overflow-hidden group \
     bg-gradient-to-br from-card via-card/40 to-card/20 \
     shadow-[inset_0_0_8px_rgba(255,255,255,0.06),0_4px_12px_rgba(0,0,0,0.25)] \
     hover:shadow-[inset_0_0_12px_rgba(255,255,255,0.08),0_6px_16px_rgba(0,140,255,0.25)] \
     backdrop-blur-sm";

  const glowLayer =
    "absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-r from-blue-500/10 via-blue-400/10 to-blue-500/10 blur-xl transition-opacity";

  const activeGlow = "shadow-[0_0_18px_rgba(0,140,255,0.5)] ring-1 ring-blue-400/60";

  const hoverLift = "group-hover:-translate-y-[1px] group-active:translate-y-[1px] transition-transform";

  const sidebarContent = (
    <>
      <div
        className="px-6 mb-8 cursor-pointer flex items-center justify-center relative group"
        onClick={() => handleNavigation("/")}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-white/5 to-blue-500/10 blur-xl opacity-0 group-hover:opacity-100 transition" />
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
            buttonBase,
            hoverLift,
            isActive("/")
              ? `bg-accent/60 text-accent-foreground ${activeGlow}`
              : "hover:bg-accent/40 hover:shadow-[0_0_12px_rgba(0,140,255,0.3)]",
          )}
          onClick={() => handleNavigation("/")}
        >
          <span className={glowLayer} />
          <Home className="w-5 h-5 relative z-10" />
          <span className="font-semibold relative z-10">Home</span>
        </Button>

        <div className="py-4">
          <div className="px-3 mb-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Crypto</p>
          </div>
        </div>

        {isLoading ? (
          <div className="mx-3 p-4 rounded-xl border border-border bg-card/30 backdrop-blur-sm animate-pulse" />
        ) : cryptoData ? (
          <div className="mx-3 p-4 rounded-xl border border-border bg-gradient-to-br from-card to-card/50 backdrop-blur-sm shadow-inner">
            <div className="flex items-center gap-3 mb-2">
              <img src={litecoinLogo} className="w-8 h-8" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">{cryptoData.symbol}</span>
                  <div
                    className={cn(
                      "flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded",
                      cryptoData.isPositive ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500",
                    )}
                  >
                    {cryptoData.isPositive ? (
                      <ArrowUpRight className="w-3 h-3" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3" />
                    )}
                    {Math.abs(cryptoData.change24h).toFixed(2)}%
                  </div>
                </div>
                <p className="text-lg font-bold text-foreground">${cryptoData.price.toFixed(2)}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-3 p-3 rounded-xl border border-border text-center text-xs text-muted-foreground">
            Failed to load
          </div>
        )}

        <div className="py-4">
          <div className="px-3 mb-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <TrendingUp className="w-4 h-4" />
            Game Item Values
          </div>
        </div>

        {gameItems.map((item) => (
          <Button
            key={item.title}
            variant="ghost"
            className={cn(
              buttonBase,
              hoverLift,
              isActive(item.path)
                ? `bg-accent/60 text-accent-foreground ${activeGlow}`
                : "hover:bg-accent/40 hover:shadow-[0_0_12px_rgba(0,140,255,0.3)]",
            )}
            onClick={() => handleNavigation(item.path)}
          >
            <span className={glowLayer} />
            {item.title === "GAG" ? (
              <span className="relative z-10 font-extrabold text-lg px-3 py-1 rounded-lg bg-yellow-400 text-black shadow-[0_4px_0px_#d1a200] group-hover:shadow-[0_6px_0px_#b48b00] group-hover:scale-[1.05] group-active:scale-[0.97] transition-all duration-200">
                GAG
              </span>
            ) : (
              <span className="font-bold text-lg relative z-10">{item.title}</span>
            )}
          </Button>
        ))}

        <Button
          variant="ghost"
          className={cn(buttonBase, hoverLift, "mt-2 hover:bg-accent/40 hover:shadow-[0_0_12px_rgba(0,140,255,0.3)]")}
          onClick={() => window.open("https://www.rolimons.com/", "_blank")}
        >
          <span className={glowLayer} />
          <ExternalLink className="w-5 h-5 relative z-10" />
          <span className="font-medium relative z-10">Rolimons Stats</span>
        </Button>

        {isAdmin && (
          <>
            <div className="py-4">
              <div className="h-px bg-border" />
            </div>

            <Button
              variant="ghost"
              className={cn(
                buttonBase,
                hoverLift,
                isActive("/admin")
                  ? "bg-destructive/20 text-destructive shadow-[0_0_18px_rgba(255,0,0,0.4)]"
                  : "hover:bg-destructive/10 hover:shadow-[0_0_12px_rgba(255,0,0,0.3)]",
              )}
              onClick={() => handleNavigation("/admin")}
            >
              <span className={"absolute inset-0 bg-red-500/10 blur-xl opacity-0 group-hover:opacity-100 transition"} />
              <Shield className="w-5 h-5 relative z-10" />
              <span className="font-medium relative z-10">Admin Panel</span>
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
          <Button variant="ghost" size="icon" className="fixed top-4 left-4 z-50 lg:hidden">
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex flex-col h-full py-6 overflow-y-auto">{sidebarContent}</div>
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
