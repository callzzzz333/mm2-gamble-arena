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
import { useState, useEffect } from "react";
import faqBanner from "@/assets/banners/faq-banner.png";
import giveawaysBanner from "@/assets/banners/giveaways-banner.png";

export const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth(false);
  const { isAdmin } = useAdminCheck(user);
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  
  // Fetch Litecoin price every second for realtime updates
  const { cryptoData, isLoading, refresh } = useCryptoPrice("litecoin");

  // Re-fetch every 1 second
  useEffect(() => {
    const interval = setInterval(() => {
      refresh();
    }, 1000);

    return () => clearInterval(interval);
  }, [refresh]);

  const isActive = (path) => location.pathname === path;
  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) setOpen(false);
  };

  const mainItems = [
    { title: "Values", path: "/items?game=all", key: "values", icon: TrendingUp },
  ];

  const gameItems = [
    { title: "SAB", path: "/items?game=sab", key: "sab" },
    { title: "PVB", path: "/items?game=pvb", key: "pvb" },
    { title: "GAG", path: "/items?game=gag", key: "gag" },
    { title: "MM2", path: "/items?game=mm2", key: "mm2" },
    { title: "ADM", path: "/items?game=adm", key: "adm" },
  ];

  const sectionItems = [
    { title: "Giveaways", path: "/giveaways", key: "giveaways" },
    { title: "FAQ", path: "/faq", key: "faq" },
    { title: "Socials", path: "/socials", key: "socials" },
  ];

  const buttonBase =
    "w-full justify-start h-12 px-4 rounded-lg transition-all border-2 border-border/50 \
     bg-card/50 backdrop-blur-sm hover:bg-card/70 hover:border-border";

  const sidebarContent = (
    <>
      <div
        className="px-6 mb-8 cursor-pointer flex items-center justify-center"
        onClick={() => handleNavigation("/")}
      >
        <img
          src={logo}
          alt="Royale Logo"
          className="h-16 w-auto hover:scale-105 transition-transform"
        />
      </div>

      <div className="flex-1 space-y-1 px-3">
        <Button
          variant="ghost"
          className={cn(
            buttonBase,
            isActive("/") ? "bg-accent text-accent-foreground" : "",
          )}
          onClick={() => handleNavigation("/")}
        >
          <Home className="w-5 h-5" />
          <span className="font-semibold">Home</span>
        </Button>

        {mainItems.map((item) => (
          <Button
            key={item.title}
            variant="ghost"
            className={cn(
              buttonBase,
              location.pathname === "/items" ? "bg-accent text-accent-foreground" : "",
            )}
            onClick={() => handleNavigation(item.path)}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-semibold">{item.title}</span>
          </Button>
        ))}

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

        <div className="grid grid-cols-2 gap-2 px-1">
          {gameItems.map((item) => (
            <Button
              key={item.title}
              variant="ghost"
              className={cn(
                "h-24 rounded-lg transition-all hover:scale-105 border-2 border-border/50 bg-card/50",
                isActive(item.path) ? "ring-2 ring-primary shadow-lg" : "",
              )}
              onClick={() => handleNavigation(item.path)}
            >
              <span className="font-bold text-lg">{item.title}</span>
            </Button>
          ))}
        </div>

        <div className="py-4">
          <div className="px-3 mb-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Community</p>
          </div>
        </div>

        <div className="space-y-2">
          <Button
            variant="ghost"
            className={cn(
              "w-full h-20 p-0 rounded-lg overflow-hidden transition-all hover:scale-102",
              isActive("/giveaways") ? "ring-2 ring-primary shadow-lg" : "",
            )}
            onClick={() => handleNavigation("/giveaways")}
          >
            <img 
              src={giveawaysBanner} 
              alt="Giveaways"
              className="w-full h-full object-cover"
            />
          </Button>

          <Button
            variant="ghost"
            className={cn(
              "w-full h-20 p-0 rounded-lg overflow-hidden transition-all hover:scale-102",
              isActive("/faq") ? "ring-2 ring-primary shadow-lg" : "",
            )}
            onClick={() => handleNavigation("/faq")}
          >
            <img 
              src={faqBanner} 
              alt="FAQ"
              className="w-full h-full object-cover"
            />
          </Button>

          <Button
            variant="ghost"
            className={cn(
              "w-full h-20 rounded-lg transition-all hover:scale-102 border-2 border-border/50 bg-card/50",
              isActive("/socials") ? "ring-2 ring-primary shadow-lg" : "",
            )}
            onClick={() => handleNavigation("/socials")}
          >
            <span className="font-bold text-lg">Socials</span>
          </Button>
        </div>

        {isAdmin && (
          <>
            <div className="py-4">
              <div className="h-px bg-border" />
            </div>

            <Button
              variant="ghost"
              className={cn(
                buttonBase,
                isActive("/admin") ? "bg-destructive/20 text-destructive" : "hover:bg-destructive/10",
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
