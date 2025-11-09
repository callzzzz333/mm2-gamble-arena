import { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { LiveChat } from "@/components/LiveChat";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { CircleDot, Trophy } from "lucide-react";
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

interface RouletteBet {
  id: string;
  user_id: string;
  bet_color: string;
  bet_amount: string;
  won: boolean | null;
  profiles: any;
}

const NUMBERS = [
  { num: 1, color: "red" }, { num: 2, color: "black" }, { num: 3, color: "red" },
  { num: 4, color: "black" }, { num: 5, color: "red" }, { num: 6, color: "black" },
  { num: 7, color: "red" }, { num: 8, color: "black" }, { num: 9, color: "red" },
  { num: 10, color: "black" }, { num: 11, color: "red" }, { num: 12, color: "black" },
  { num: 13, color: "red" }, { num: 14, color: "black" }
];

export default function Roulette() {
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [selectedColor, setSelectedColor] = useState<"red" | "black" | "green">("red");
  const [bets, setBets] = useState<RouletteBet[]>([]);
  const [gameStatus, setGameStatus] = useState<"waiting" | "spinning" | "completed">("waiting");
  const [countdown, setCountdown] = useState(15);
  const [spinningNumber, setSpinningNumber] = useState<number | null>(null);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchBets = useCallback(async () => {
    const { data: currentGame } = await supabase
      .from("roulette_games")
      .select("*")
      .eq("status", "waiting")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (currentGame) {
      const { data: betsData } = await supabase
        .from("roulette_bets")
        .select(`
          *,
          profiles!roulette_bets_user_id_fkey(username, avatar_url, roblox_username)
        `)
        .eq("game_id", currentGame.id);

      if (betsData) setBets(betsData as any);
    }
  }, []);

  useEffect(() => {
    fetchBets();

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) return 15;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [fetchBets]);

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

    setIsPlacingBet(true);

    try {
      // Get or create current game
      let { data: currentGame } = await supabase
        .from("roulette_games")
        .select("*")
        .eq("status", "waiting")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!currentGame) {
        const { data: newGame } = await supabase
          .from("roulette_games")
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

      await supabase.from("roulette_bets").insert({
        game_id: currentGame.id,
        user_id: user.id,
        bet_color: selectedColor,
        bet_amount: getTotalValue(),
        items: itemsData,
      });

      setSelectedItems([]);
      toast({ title: "Bet placed!", description: `Betting on ${selectedColor.toUpperCase()}` });
      fetchBets();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsPlacingBet(false);
    }
  };

  const getColorClass = (color: string) => {
    if (color === "red") return "bg-red-600 hover:bg-red-700";
    if (color === "black") return "bg-zinc-900 hover:bg-zinc-800";
    return "bg-green-600 hover:bg-green-700";
  };

  const getColorTotals = () => {
    const totals = { red: 0, black: 0, green: 0 };
    bets.forEach((bet) => {
      totals[bet.bet_color as keyof typeof totals] += Number(bet.bet_amount);
    });
    return totals;
  };

  const totals = getColorTotals();
  const grandTotal = totals.red + totals.black + totals.green;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="ml-64 mr-96">
        <TopBar />
        <main className="p-8 pt-24">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow">
                <CircleDot className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Roulette</h1>
                <p className="text-muted-foreground">Bet on red, black, or green to win big</p>
              </div>
            </div>

            {/* Countdown */}
            <Card className="p-6 bg-gradient-to-r from-primary/20 to-accent/20 border-primary/50">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Next spin in</p>
                <p className="text-5xl font-bold text-primary">{countdown}s</p>
              </div>
            </Card>

            {/* Roulette Wheel */}
            <Card className="p-8 bg-card">
              <div className="flex justify-center items-center mb-6">
                <div className="relative w-96 h-96 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 border-8 border-primary/30 shadow-2xl">
                  <div className="absolute inset-0 rounded-full border-8 border-zinc-700">
                    {NUMBERS.map((item, idx) => {
                      const angle = (idx * 360) / NUMBERS.length - 90;
                      const radius = 140;
                      const x = Math.cos((angle * Math.PI) / 180) * radius;
                      const y = Math.sin((angle * Math.PI) / 180) * radius;
                      
                      return (
                        <div
                          key={idx}
                          className={`absolute w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg border-2 border-zinc-600 ${
                            item.color === "red" ? "bg-red-600" : "bg-zinc-900"
                          }`}
                          style={{
                            left: `calc(50% + ${x}px - 24px)`,
                            top: `calc(50% + ${y}px - 24px)`,
                          }}
                        >
                          {item.num}
                        </div>
                      );
                    })}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-green-600 border-4 border-zinc-700 flex items-center justify-center text-white font-bold text-xl">
                      0
                    </div>
                  </div>
                  {/* Pointer */}
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 w-4 h-8 bg-primary clip-triangle"></div>
                </div>
              </div>

              {/* Color Totals */}
              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="text-center p-4 bg-red-600/20 rounded-lg border border-red-600/30">
                  <p className="text-sm text-muted-foreground mb-1">Red</p>
                  <p className="text-2xl font-bold text-red-500">${totals.red.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {grandTotal > 0 ? ((totals.red / grandTotal) * 100).toFixed(1) : 0}%
                  </p>
                </div>
                <div className="text-center p-4 bg-green-600/20 rounded-lg border border-green-600/30">
                  <p className="text-sm text-muted-foreground mb-1">Green (0)</p>
                  <p className="text-2xl font-bold text-green-500">${totals.green.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {grandTotal > 0 ? ((totals.green / grandTotal) * 100).toFixed(1) : 0}%
                  </p>
                </div>
                <div className="text-center p-4 bg-zinc-900/50 rounded-lg border border-zinc-700">
                  <p className="text-sm text-muted-foreground mb-1">Black</p>
                  <p className="text-2xl font-bold">${totals.black.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {grandTotal > 0 ? ((totals.black / grandTotal) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </div>
            </Card>

            {/* Place Bet */}
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Place Your Bet</h2>
              
              {/* Color Selection */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <Button
                  onClick={() => setSelectedColor("red")}
                  className={`h-16 ${selectedColor === "red" ? "ring-2 ring-primary" : ""} ${getColorClass("red")}`}
                >
                  RED (2x)
                </Button>
                <Button
                  onClick={() => setSelectedColor("green")}
                  className={`h-16 ${selectedColor === "green" ? "ring-2 ring-primary" : ""} ${getColorClass("green")}`}
                >
                  GREEN (14x)
                </Button>
                <Button
                  onClick={() => setSelectedColor("black")}
                  className={`h-16 ${selectedColor === "black" ? "ring-2 ring-primary" : ""} ${getColorClass("black")}`}
                >
                  BLACK (2x)
                </Button>
              </div>

              {/* Selected Items */}
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
                <Button onClick={placeBet} disabled={isPlacingBet || selectedItems.length === 0} className="flex-1">
                  Place Bet on {selectedColor.toUpperCase()}
                </Button>
              </div>
            </Card>

            {/* Active Bets */}
            {bets.length > 0 && (
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">Active Bets</h2>
                <div className="space-y-2">
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
                        <Badge className={bet.bet_color === "red" ? "bg-red-600" : bet.bet_color === "green" ? "bg-green-600" : "bg-zinc-900"}>
                          {bet.bet_color.toUpperCase()}
                        </Badge>
                        <span className="font-bold">${Number(bet.bet_amount).toFixed(2)}</span>
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
