import { useState, useEffect, useCallback, useRef } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { LiveChat } from "@/components/LiveChat";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { CircleDot } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { UserInventoryDialog } from "@/components/UserInventoryDialog";
import { useAuth } from "@/hooks/useAuth";
import { Progress } from "@/components/ui/progress";
import rouletteRedIcon from "@/assets/roulette-red.svg";
import rouletteGreenIcon from "@/assets/roulette-green.svg";
import rouletteBlueIcon from "@/assets/roulette-blue.svg";

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
  items: any;
}

interface ReelItem {
  color: "red" | "black" | "green";
  icon: string;
  isResult?: boolean;
}

export default function Roulette() {
  const [selectedItems, setSelectedItems] = useState<{ red: SelectedItem[], green: SelectedItem[], black: SelectedItem[] }>({
    red: [], green: [], black: []
  });
  const [activeColor, setActiveColor] = useState<"red" | "black" | "green" | null>(null);
  const [bets, setBets] = useState<RouletteBet[]>([]);
  const [gameStatus, setGameStatus] = useState<"waiting" | "spinning" | "completed">("waiting");
  const [countdown, setCountdown] = useState(15);
  const [lastResults, setLastResults] = useState<string[]>([]);
  const [reelItems, setReelItems] = useState<ReelItem[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const reelRef = useRef<HTMLDivElement>(null);
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

  const fetchLastResults = useCallback(async () => {
    const { data } = await supabase
      .from("roulette_games")
      .select("spin_color")
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(100);
    
    if (data) {
      setLastResults(data.map(g => g.spin_color).filter(Boolean));
    }
  }, []);

  const generateReelItems = (resultColor?: string) => {
    const items: ReelItem[] = [];
    const colors: ("red" | "black" | "green")[] = ["red", "black", "green"];
    
    for (let i = 0; i < 50; i++) {
      const color = i === 25 && resultColor 
        ? (resultColor as "red" | "black" | "green")
        : colors[Math.floor(Math.random() * colors.length)];
      
      const icon = color === "green" ? rouletteGreenIcon : color === "red" ? rouletteRedIcon : rouletteBlueIcon;
      
      items.push({
        color,
        icon,
        isResult: i === 25 && resultColor !== undefined
      });
    }
    return items;
  };

  useEffect(() => {
    fetchBets();
    fetchLastResults();
    setReelItems(generateReelItems());

    const interval = setInterval(async () => {
      setCountdown((prev) => {
        if (prev <= 1) {
          triggerSpin();
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [fetchBets, fetchLastResults]);

  const triggerSpin = async () => {
    try {
      const { data: currentGame } = await supabase
        .from("roulette_games")
        .select("*")
        .eq("status", "waiting")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!currentGame) return;

      setGameStatus("spinning");
      setIsAnimating(true);

      const { data, error } = await supabase.functions.invoke("roulette-spin", {
        body: { gameId: currentGame.id },
      });

      if (error) {
        console.error("Spin error:", error);
        setGameStatus("waiting");
        setIsAnimating(false);
        return;
      }

      const resultColor = data.result;
      const newReelItems = generateReelItems(resultColor);
      setReelItems(newReelItems);

      if (reelRef.current) {
        reelRef.current.style.transition = "none";
        reelRef.current.style.transform = "translateX(0)";
        
        setTimeout(() => {
          if (reelRef.current) {
            reelRef.current.style.transition = "transform 5s cubic-bezier(0.17, 0.67, 0.12, 0.99)";
            reelRef.current.style.transform = `translateX(-${25 * 80 - 40}px)`;
          }
        }, 50);
      }

      setTimeout(() => {
        setGameStatus("completed");
        setIsAnimating(false);
        fetchLastResults();
        
        setTimeout(() => {
          setGameStatus("waiting");
          setReelItems(generateReelItems());
          fetchBets();
        }, 3000);
      }, 5000);
    } catch (error) {
      console.error("Error triggering spin:", error);
      setGameStatus("waiting");
      setIsAnimating(false);
    }
  };

  const handleSelectItem = useCallback((itemWithQty: Item & { quantity: number }, color: "red" | "black" | "green") => {
    setSelectedItems((prev) => {
      const colorItems = prev[color];
      const existing = colorItems.find((si) => si.item.id === itemWithQty.id);
      
      if (existing) {
        return {
          ...prev,
          [color]: colorItems.map((si) =>
            si.item.id === itemWithQty.id ? { ...si, quantity: si.quantity + 1 } : si
          )
        };
      } else {
        const { quantity, ...item } = itemWithQty;
        return {
          ...prev,
          [color]: [...colorItems, { item, quantity: 1 }]
        };
      }
    });
  }, []);

  const getTotalValue = (color: "red" | "black" | "green") => {
    return selectedItems[color].reduce((sum, si) => sum + si.item.value * si.quantity, 0);
  };

  const clearBets = (color: "red" | "black" | "green") => {
    setSelectedItems(prev => ({ ...prev, [color]: [] }));
  };

  const adjustBetAmount = (color: "red" | "black" | "green", multiplier: number) => {
    // Adjust item quantities
    setSelectedItems(prev => ({
      ...prev,
      [color]: prev[color].map(si => ({
        ...si,
        quantity: Math.max(1, Math.floor(si.quantity * multiplier))
      }))
    }));
  };

  const placeBet = async (color: "red" | "black" | "green") => {
    if (!user) {
      toast({ title: "Please login first", variant: "destructive" });
      return;
    }

    if (selectedItems[color].length === 0) {
      toast({ title: "Please select items to bet", variant: "destructive" });
      return;
    }

    setIsPlacingBet(true);

    try {
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

      const itemsData = selectedItems[color].map((si) => ({
        item_id: si.item.id,
        name: si.item.name,
        value: si.item.value,
        quantity: si.quantity,
        image_url: si.item.image_url,
        rarity: si.item.rarity,
      }));

      for (const si of selectedItems[color]) {
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
        bet_color: color,
        bet_amount: getTotalValue(color),
        items: itemsData,
      });

      setSelectedItems(prev => ({ ...prev, [color]: [] }));
      toast({ title: "Bet placed!", description: `Betting on ${color.toUpperCase()}` });
      fetchBets();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsPlacingBet(false);
    }
  };

  const getColorTotals = () => {
    const totals = { red: 0, black: 0, green: 0 };
    bets.forEach((bet) => {
      totals[bet.bet_color as keyof typeof totals] += Number(bet.bet_amount);
    });
    return totals;
  };

  const getColorBetsCount = (color: "red" | "black" | "green") => {
    return bets.filter(b => b.bet_color === color).length;
  };

  const getColorIcon = (color: string) => {
    if (color === "red") return rouletteRedIcon;
    if (color === "black") return rouletteBlueIcon;
    return rouletteGreenIcon;
  };

  const totals = getColorTotals();
  const lastResultsCounts = {
    red: lastResults.filter(r => r === "red").length,
    green: lastResults.filter(r => r === "green").length,
    black: lastResults.filter(r => r === "black").length,
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="ml-64 mr-96">
        <TopBar />
        <main className="p-8 pt-24">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <CircleDot className="w-7 h-7" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">Roulette</h1>
                  <p className="text-muted-foreground">Bet on red, black, or green to win</p>
                </div>
              </div>
              
              {/* Last 100 Results */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-muted-foreground uppercase">LAST 100</span>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="text-sm font-bold">{lastResultsCounts.red}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-pink-500" />
                    <span className="text-sm font-bold">{lastResultsCounts.green}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="text-sm font-bold">{lastResultsCounts.black}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Last 10 Results Circles */}
            <div className="flex gap-2">
              {lastResults.slice(0, 10).map((color, idx) => {
                const iconSrc = getColorIcon(color);
                return (
                  <div
                    key={idx}
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      color === "red" ? "bg-amber-500" : color === "green" ? "bg-pink-500" : "bg-blue-500"
                    }`}
                  >
                    <img src={iconSrc} alt={color} className="w-5 h-5" />
                  </div>
                );
              })}
            </div>

            {/* Reel Container */}
            <Card className="p-6 bg-card/50 backdrop-blur">
              <div className="relative overflow-hidden mb-6" style={{ height: "120px" }}>
                {/* Winning Indicator */}
                <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-1 bg-white z-20 shadow-[0_0_20px_rgba(255,255,255,0.8)]" />
                
                {/* Reel */}
                <div ref={reelRef} className="flex gap-2 items-center" style={{ paddingLeft: "50%" }}>
                  {reelItems.map((item, idx) => {
                    return (
                      <div
                        key={idx}
                        className={`flex-shrink-0 w-20 h-20 rounded-xl flex items-center justify-center shadow-lg ${
                          item.color === "red"
                            ? "bg-gradient-to-br from-amber-500 to-amber-600 shadow-amber-500/50"
                            : item.color === "green"
                            ? "bg-gradient-to-br from-pink-500 to-pink-600 shadow-pink-500/50"
                            : "bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/50"
                        } ${item.isResult ? "ring-4 ring-white" : ""}`}
                      >
                        <img src={item.icon} alt={item.color} className="w-10 h-10" />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Rolling Text & Progress */}
              <div className="text-center mb-4">
                <p className="text-2xl font-bold mb-2">
                  {gameStatus === "spinning" ? "SPINNING..." : `ROLLING IN ${countdown.toFixed(2)}`}
                </p>
                <Progress value={(countdown / 15) * 100} className="h-2" />
              </div>
            </Card>

            {/* Betting Sections */}
            <div className="grid grid-cols-3 gap-4">
              {/* Red Section */}
              <Card className="p-6 bg-amber-500/10 border-amber-500/30">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <img src={rouletteRedIcon} alt="red" className="w-6 h-6" />
                  <span className="text-xl font-bold">Win 2x</span>
                </div>
                
                <Button
                  onClick={() => {
                    setActiveColor("red");
                    setInventoryOpen(true);
                  }}
                  disabled={isAnimating}
                  className="w-full h-14 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-lg mb-3"
                >
                  Place Bet
                </Button>

                <div className="flex items-center justify-between text-sm mb-2">
                  <span>{getColorBetsCount("red")} Bets</span>
                  <span className="font-bold text-amber-500">${totals.red.toFixed(2)}</span>
                </div>

                {selectedItems.red.length > 0 && (
                  <div className="mt-3 p-2 bg-background/50 rounded space-y-1">
                    {selectedItems.red.map(si => (
                      <div key={si.item.id} className="text-xs flex justify-between">
                        <span>{si.item.name} x{si.quantity}</span>
                        <span>${(si.item.value * si.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Green Section */}
              <Card className="p-6 bg-pink-500/10 border-pink-500/30">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <img src={rouletteGreenIcon} alt="green" className="w-6 h-6" />
                  <span className="text-xl font-bold">Win 14x</span>
                </div>
                
                <Button
                  onClick={() => {
                    setActiveColor("green");
                    setInventoryOpen(true);
                  }}
                  disabled={isAnimating}
                  className="w-full h-14 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-bold text-lg mb-3"
                >
                  Place Bet
                </Button>

                <div className="flex items-center justify-between text-sm mb-2">
                  <span>{getColorBetsCount("green")} Bets</span>
                  <span className="font-bold text-pink-500">${totals.green.toFixed(2)}</span>
                </div>

                {selectedItems.green.length > 0 && (
                  <div className="mt-3 p-2 bg-background/50 rounded space-y-1">
                    {selectedItems.green.map(si => (
                      <div key={si.item.id} className="text-xs flex justify-between">
                        <span>{si.item.name} x{si.quantity}</span>
                        <span>${(si.item.value * si.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Black Section */}
              <Card className="p-6 bg-blue-500/10 border-blue-500/30">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <img src={rouletteBlueIcon} alt="black" className="w-6 h-6" />
                  <span className="text-xl font-bold">Win 2x</span>
                </div>
                
                <Button
                  onClick={() => {
                    setActiveColor("black");
                    setInventoryOpen(true);
                  }}
                  disabled={isAnimating}
                  className="w-full h-14 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold text-lg mb-3"
                >
                  Place Bet
                </Button>

                <div className="flex items-center justify-between text-sm mb-2">
                  <span>{getColorBetsCount("black")} Bets</span>
                  <span className="font-bold text-blue-500">${totals.black.toFixed(2)}</span>
                </div>

                {selectedItems.black.length > 0 && (
                  <div className="mt-3 p-2 bg-background/50 rounded space-y-1">
                    {selectedItems.black.map(si => (
                      <div key={si.item.id} className="text-xs flex justify-between">
                        <span>{si.item.name} x{si.quantity}</span>
                        <span>${(si.item.value * si.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </main>
      </div>
      <LiveChat />
      
      {activeColor && (
        <UserInventoryDialog
          open={inventoryOpen}
          onOpenChange={setInventoryOpen}
          onSelectItem={(item) => handleSelectItem(item, activeColor)}
          multiSelect={true}
          selectedItems={[]}
        />
      )}
    </div>
  );
}
