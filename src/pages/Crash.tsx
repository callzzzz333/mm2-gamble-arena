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

    // Game loop
    const interval = setInterval(async () => {
      if (gameStatus === "waiting") {
        setCountdown((prev) => {
          if (prev <= 1) {
            startGame();
            return 5;
          }
          return prev - 1;
        });
      } else if (gameStatus === "flying") {
        setCurrentMultiplier((prev) => {
          const next = prev + 0.02;
          
          // Check if we should crash (random between 1.2x and 10x)
          const shouldCrash = Math.random() < 0.008 * (next - 1);
          if (shouldCrash) {
            handleCrash(next);
          }
          
          return next;
        });
      }
    }, 50);

    return () => clearInterval(interval);
  }, [gameStatus, fetchBets]);

  const startGame = async () => {
    try {
      // Get or create game
      let { data: currentGame } = await supabase
        .from("crash_games")
        .select("*")
        .eq("status", "waiting")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!currentGame) {
        const { data: newGame } = await supabase
          .from("crash_games")
          .insert({ status: "flying", started_at: new Date().toISOString() })
          .select()
          .single();
        currentGame = newGame;
      } else {
        await supabase
          .from("crash_games")
          .update({ status: "flying", started_at: new Date().toISOString() })
          .eq("id", currentGame.id);
      }

      setGameStatus("flying");
      setCurrentMultiplier(1.0);
    } catch (error) {
      console.error("Error starting game:", error);
    }
  };

  const handleCrash = async (crashMultiplier: number) => {
    setCrashPoint(crashMultiplier);
    setGameStatus("crashed");

    try {
      // Get current game
      const { data: currentGame } = await supabase
        .from("crash_games")
        .select("*")
        .in("status", ["flying"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (currentGame) {
        // Call edge function to process crash and payouts
        await supabase.functions.invoke("crash-spin", {
          body: { gameId: currentGame.id, crashPoint: crashMultiplier },
        });
      }

      // Reset after showing result
      setTimeout(() => {
        setGameStatus("waiting");
        setCountdown(5);
        setHasBet(false);
        setCrashPoint(null);
        fetchBets();
      }, 3000);
    } catch (error) {
      console.error("Error handling crash:", error);
    }
  };

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
            <Card className="p-8 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 border-2 border-primary/30 shadow-2xl">
              <div className="text-center mb-6">
                {gameStatus === "waiting" ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Next round starts in</p>
                    <div className="relative inline-block">
                      <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full"></div>
                      <p className="text-6xl font-bold text-primary relative animate-pulse">{countdown}s</p>
                    </div>
                  </div>
                ) : gameStatus === "crashed" ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Crashed at</p>
                    <div className="relative inline-block">
                      <div className="absolute inset-0 bg-destructive/20 blur-2xl rounded-full"></div>
                      <p className="text-6xl font-bold text-destructive relative">{crashPoint?.toFixed(2)}x</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Current Multiplier</p>
                    <div className="relative inline-block">
                      <div className="absolute inset-0 bg-green-500/30 blur-3xl rounded-full animate-pulse"></div>
                      <p className="text-7xl font-bold bg-gradient-to-r from-green-400 via-green-500 to-green-600 bg-clip-text text-transparent relative">
                        {currentMultiplier.toFixed(2)}x
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Graph */}
              <div className="relative bg-gradient-to-b from-zinc-900/80 to-zinc-950 rounded-xl p-6 border border-primary/20 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent"></div>
                <canvas ref={canvasRef} width={800} height={300} className="w-full relative z-10" />
                {gameStatus === "flying" && (
                  <div className="absolute bottom-8 left-8 z-20 animate-pulse">
                    <Rocket className="w-12 h-12 text-green-500 drop-shadow-[0_0_15px_rgba(34,197,94,0.8)]" />
                  </div>
                )}
              </div>

              {/* Cashout Button */}
              {gameStatus === "flying" && hasBet && (
                <Button 
                  onClick={cashout} 
                  size="lg" 
                  className="w-full mt-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-2xl h-16 font-bold shadow-lg shadow-green-500/50 animate-pulse"
                >
                  <TrendingUp className="w-6 h-6 mr-2" />
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
