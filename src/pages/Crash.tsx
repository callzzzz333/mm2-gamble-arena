import { useState, useEffect, useCallback, useRef } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { LiveChat } from "@/components/LiveChat";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Rocket, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { UserInventoryDialog } from "@/components/UserInventoryDialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";

interface Item {
  id: string;
  name: string;
  rarity: string;
  value: number;
  image_url: string | null;
}

interface SelectedItem {
  item: Item;
  quantity: number;
}

interface CrashBet {
  id: string;
  user_id: string;
  bet_amount: string;
  cashout_at: number | null;
  cashed_out: boolean;
  profiles: any;
}

export default function Crash() {
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [bets, setBets] = useState<CrashBet[]>([]);
  const [gameStatus, setGameStatus] = useState<"waiting" | "flying" | "crashed">("waiting");
  const [currentMultiplier, setCurrentMultiplier] = useState(1.0);
  const [crashPoint, setCrashPoint] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(5);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [hasBet, setHasBet] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const fetchBets = useCallback(async () => {
    const { data: currentGame } = await supabase
      .from("crash_games")
      .select("*")
      .in("status", ["waiting", "flying"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (currentGame) {
      const { data: betsData } = await supabase
        .from("crash_bets")
        .select(`
          *,
          profiles!crash_bets_user_id_fkey(username, avatar_url, roblox_username)
        `)
        .eq("game_id", currentGame.id);

      if (betsData) setBets(betsData as any);
      
      if (user) {
        const userBet = betsData?.find((b: any) => b.user_id === user.id);
        setHasBet(!!userBet);
      }
    }
  }, [user]);

  useEffect(() => {
    fetchBets();

    // Simulate game loop
    const interval = setInterval(() => {
      if (gameStatus === "waiting") {
        setCountdown((prev) => {
          if (prev <= 1) {
            setGameStatus("flying");
            setCurrentMultiplier(1.0);
            return 5;
          }
          return prev - 1;
        });
      } else if (gameStatus === "flying") {
        setCurrentMultiplier((prev) => {
          const next = prev + 0.01;
          // Random crash between 1.5x and 10x
          if (Math.random() < 0.005 * (next - 1)) {
            setCrashPoint(next);
            setGameStatus("crashed");
            setTimeout(() => {
              setGameStatus("waiting");
              setCountdown(5);
              setHasBet(false);
            }, 3000);
          }
          return next;
        });
      }
    }, 50);

    return () => clearInterval(interval);
  }, [gameStatus, fetchBets]);

  // Draw graph
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
      ctx.beginPath();
      ctx.moveTo(0, (canvas.height / 10) * i);
      ctx.lineTo(canvas.width, (canvas.height / 10) * i);
      ctx.stroke();
    }

    // Draw curve
    if (gameStatus === "flying" || gameStatus === "crashed") {
      ctx.strokeStyle = gameStatus === "crashed" ? "#ef4444" : "#22c55e";
      ctx.lineWidth = 3;
      ctx.beginPath();
      
      const points = 100;
      for (let i = 0; i <= points; i++) {
        const x = (canvas.width / points) * i;
        const mult = 1 + (currentMultiplier - 1) * (i / points);
        const y = canvas.height - (mult - 1) * 50;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }
  }, [currentMultiplier, gameStatus]);

  const handleSelectItem = useCallback((itemWithQty: Item & { quantity: number }) => {
    setSelectedItems((prev) => {
      const existing = prev.find((si) => si.item.id === itemWithQty.id);
      if (existing) {
        return prev.map((si) =>
          si.item.id === itemWithQty.id ? { ...si, quantity: si.quantity + 1 } : si
        );
      } else {
        const { quantity, ...item } = itemWithQty;
        return [...prev, { item, quantity: 1 }];
      }
    });
  }, []);

  const getTotalValue = () => {
    return selectedItems.reduce((sum, si) => sum + si.item.value * si.quantity, 0);
  };

  const placeBet = async () => {
    if (!user) {
      toast({ title: "Please login first", variant: "destructive" });
      return;
    }

    if (selectedItems.length === 0) {
      toast({ title: "Please select items to bet", variant: "destructive" });
      return;
    }

    if (gameStatus !== "waiting") {
      toast({ title: "Wait for next round", variant: "destructive" });
      return;
    }

    setIsPlacingBet(true);

    try {
      let { data: currentGame } = await supabase
        .from("crash_games")
        .select("*")
        .eq("status", "waiting")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!currentGame) {
        const { data: newGame } = await supabase
          .from("crash_games")
          .insert({ status: "waiting" })
          .select()
          .single();
        currentGame = newGame;
      }

      const itemsData = selectedItems.map((si) => ({
        item_id: si.item.id,
        name: si.item.name,
        value: si.item.value,
        quantity: si.quantity,
        image_url: si.item.image_url,
        rarity: si.item.rarity,
      }));

      // Remove items from inventory
      for (const si of selectedItems) {
        const { data: userItem } = await supabase
          .from("user_items")
          .select("*")
          .eq("user_id", user.id)
          .eq("item_id", si.item.id)
          .single();

        if (userItem) {
          if (userItem.quantity === si.quantity) {
            await supabase.from("user_items").delete().eq("id", userItem.id);
          } else {
            await supabase
              .from("user_items")
              .update({ quantity: userItem.quantity - si.quantity })
              .eq("id", userItem.id);
          }
        }
      }

      await supabase.from("crash_bets").insert({
        game_id: currentGame.id,
        user_id: user.id,
        bet_amount: getTotalValue(),
        items: itemsData,
      });

      setSelectedItems([]);
      setHasBet(true);
      toast({ title: "Bet placed!", description: "Good luck!" });
      fetchBets();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsPlacingBet(false);
    }
  };

  const cashout = async () => {
    if (!user || !hasBet) return;

    try {
      const myBet = bets.find((b) => b.user_id === user.id);
      if (!myBet || myBet.cashed_out) return;

      await supabase
        .from("crash_bets")
        .update({ cashed_out: true, cashout_at: currentMultiplier })
        .eq("id", myBet.id);

      toast({
        title: "Cashed out!",
        description: `${currentMultiplier.toFixed(2)}x multiplier`,
      });
      
      setHasBet(false);
      fetchBets();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="ml-64 mr-96">
        <TopBar />
        <main className="p-8 pt-24">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow">
                <Rocket className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Crash</h1>
                <p className="text-muted-foreground">Cash out before the rocket crashes!</p>
              </div>
            </div>

            {/* Game Display */}
            <Card className="p-8 bg-gradient-to-br from-card to-secondary/20">
              <div className="text-center mb-4">
                {gameStatus === "waiting" ? (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Starting in</p>
                    <p className="text-5xl font-bold text-primary">{countdown}s</p>
                  </div>
                ) : gameStatus === "crashed" ? (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Crashed at</p>
                    <p className="text-5xl font-bold text-destructive">{crashPoint?.toFixed(2)}x</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Current Multiplier</p>
                    <p className="text-6xl font-bold bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent animate-pulse">
                      {currentMultiplier.toFixed(2)}x
                    </p>
                  </div>
                )}
              </div>

              {/* Graph */}
              <div className="relative bg-zinc-900/50 rounded-lg p-4 border border-border">
                <canvas ref={canvasRef} width={800} height={300} className="w-full" />
                {gameStatus === "flying" && (
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <Rocket className="w-16 h-16 text-primary animate-bounce" />
                  </div>
                )}
              </div>

              {/* Cashout Button */}
              {gameStatus === "flying" && hasBet && (
                <Button onClick={cashout} size="lg" className="w-full mt-4 bg-green-600 hover:bg-green-700 text-2xl h-16">
                  CASHOUT @ {currentMultiplier.toFixed(2)}x
                </Button>
              )}
            </Card>

            {/* Place Bet */}
            {gameStatus === "waiting" && (
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">Place Your Bet</h2>

                <div className="mb-4 min-h-[100px] p-4 bg-secondary/30 rounded-lg">
                  {selectedItems.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedItems.map((si) => (
                        <div key={si.item.id} className="flex items-center gap-2 bg-card p-2 rounded border">
                          {si.item.image_url && (
                            <img src={si.item.image_url} alt={si.item.name} className="w-8 h-8 object-contain" />
                          )}
                          <span className="text-sm">{si.item.name} x{si.quantity}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center">No items selected</p>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button onClick={() => setInventoryOpen(true)} variant="outline" className="flex-1">
                    Select Items (${getTotalValue().toFixed(2)})
                  </Button>
                  <Button onClick={placeBet} disabled={isPlacingBet || selectedItems.length === 0 || hasBet} className="flex-1">
                    {hasBet ? "Bet Placed" : "Place Bet"}
                  </Button>
                </div>
              </Card>
            )}

            {/* Active Bets */}
            {bets.length > 0 && (
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">Active Bets</h2>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {bets.map((bet) => (
                    <div key={bet.id} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={bet.profiles?.avatar_url || undefined} />
                          <AvatarFallback>{bet.profiles?.username?.[0] || "U"}</AvatarFallback>
                        </Avatar>
                        <span className="font-semibold">{bet.profiles?.roblox_username || bet.profiles?.username}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold">${Number(bet.bet_amount).toFixed(2)}</span>
                        {bet.cashed_out && bet.cashout_at && (
                          <Badge className="bg-green-600">@ {bet.cashout_at.toFixed(2)}x</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </main>
      </div>
      <LiveChat />

      <UserInventoryDialog
        open={inventoryOpen}
        onOpenChange={setInventoryOpen}
        onSelectItem={handleSelectItem}
        multiSelect={true}
        selectedItems={[]}
      />
    </div>
  );
}
