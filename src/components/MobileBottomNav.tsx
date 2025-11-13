import { useNavigate, useLocation } from "react-router-dom";
import { Home, Package, Trophy, DollarSign, Gamepad2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { UserInventoryDialog } from "@/components/UserInventoryDialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export const MobileBottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [gamesOpen, setGamesOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const games = [
    { title: "Coinflip", path: "/coinflip" },
    { title: "Jackpot", path: "/jackpot" },
    { title: "Roulette", path: "/roulette" },
    { title: "Crash", path: "/crash" },
    { title: "Upgrader", path: "/upgrader" },
    { title: "Case Battles", path: "/case-battles" },
  ];

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border z-50 md:hidden safe-area-inset-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {/* Home */}
          <button
            onClick={() => navigate("/")}
            className={cn(
              "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[64px]",
              isActive("/")
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Home className="w-5 h-5" />
            <span className="text-xs font-medium">Home</span>
          </button>

          {/* Games Menu */}
          <Sheet open={gamesOpen} onOpenChange={setGamesOpen}>
            <SheetTrigger asChild>
              <button
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[64px]",
                  "text-muted-foreground hover:text-foreground"
                )}
              >
                <Gamepad2 className="w-5 h-5" />
                <span className="text-xs font-medium">Games</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[60vh]">
              <SheetHeader>
                <SheetTitle>Game Modes</SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-full py-4">
                <div className="grid grid-cols-2 gap-3">
                  {games.map((game) => (
                    <Button
                      key={game.path}
                      variant="outline"
                      className="h-20 flex flex-col gap-2"
                      onClick={() => {
                        navigate(game.path);
                        setGamesOpen(false);
                      }}
                    >
                      <Gamepad2 className="w-6 h-6" />
                      <span className="text-sm font-semibold">{game.title}</span>
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>

          {/* Inventory */}
          {user && (
            <button
              onClick={() => setInventoryOpen(true)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[64px]",
                "text-muted-foreground hover:text-foreground"
              )}
            >
              <Package className="w-5 h-5" />
              <span className="text-xs font-medium">Inventory</span>
            </button>
          )}

          {/* Leaderboard */}
          <button
            onClick={() => navigate("/leaderboard")}
            className={cn(
              "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[64px]",
              isActive("/leaderboard")
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Trophy className="w-5 h-5" />
            <span className="text-xs font-medium">Ranks</span>
          </button>

          {/* Deposit */}
          {user && (
            <button
              onClick={() => navigate("/deposit")}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[64px]",
                isActive("/deposit")
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <DollarSign className="w-5 h-5" />
              <span className="text-xs font-medium">Deposit</span>
            </button>
          )}
        </div>
      </div>

      <UserInventoryDialog 
        open={inventoryOpen}
        onOpenChange={setInventoryOpen}
      />
    </>
  );
};
