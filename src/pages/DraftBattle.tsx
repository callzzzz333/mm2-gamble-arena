import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { LiveChat } from "@/components/LiveChat";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import draftBattleImg from "@/assets/draft-battle.jpg";

interface DraftItem {
  id: string;
  name: string;
  value: number;
  image_url: string;
  rarity: string;
}

export default function DraftBattle() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [availableItems, setAvailableItems] = useState<DraftItem[]>([]);
  const [myTeam, setMyTeam] = useState<DraftItem[]>([]);
  const [opponentTeam, setOpponentTeam] = useState<DraftItem[]>([]);
  const [isMyTurn, setIsMyTurn] = useState(true);
  const [gameStarted, setGameStarted] = useState(false);

  useEffect(() => {
    checkUser();
    fetchItems();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    setUser(user);

    const { data: profile } = await supabase
      .from("profiles")
      .select("balance")
      .eq("id", user.id)
      .single();

    if (profile) {
      setUserBalance(parseFloat(String(profile.balance)));
    }
  };

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from("items")
      .select("*")
      .limit(12);

    if (data) {
      setAvailableItems(data);
    }
  };

  const startGame = async () => {
    if (userBalance < 10) {
      toast.error("Need at least $10 to play");
      return;
    }

    const { data, error } = await supabase.rpc("update_user_balance", {
      p_user_id: user.id,
      p_amount: -10,
      p_type: "bet",
      p_game_type: "draft_battle",
      p_description: "Draft Battle entry fee"
    });

    if (error || !data) {
      toast.error("Failed to start game");
      return;
    }

    setUserBalance(prev => prev - 10);
    setGameStarted(true);
    setMyTeam([]);
    setOpponentTeam([]);
    toast.success("Draft started! Pick your items wisely!");
  };

  const draftItem = (item: DraftItem) => {
    if (!isMyTurn) return;

    setMyTeam([...myTeam, item]);
    setAvailableItems(availableItems.filter(i => i.id !== item.id));
    setIsMyTurn(false);

    // Simulate opponent pick
    setTimeout(() => {
      const remaining = availableItems.filter(i => i.id !== item.id);
      if (remaining.length > 0) {
        const opponentPick = remaining[Math.floor(Math.random() * remaining.length)];
        setOpponentTeam([...opponentTeam, opponentPick]);
        setAvailableItems(remaining.filter(i => i.id !== opponentPick.id));
        setIsMyTurn(true);
      }
    }, 1500);

    if (myTeam.length === 2) {
      setTimeout(() => finishDraft(), 3000);
    }
  };

  const finishDraft = async () => {
    const myValue = myTeam.reduce((sum, item) => sum + item.value, 0);
    const opponentValue = opponentTeam.reduce((sum, item) => sum + item.value, 0);

    if (myValue > opponentValue) {
      const winAmount = 18;
      await supabase.rpc("update_user_balance", {
        p_user_id: user.id,
        p_amount: winAmount,
        p_type: "win",
        p_game_type: "draft_battle",
        p_description: "Draft Battle win"
      });
      setUserBalance(prev => prev + winAmount);
      toast.success(`You won! Your team: $${myValue.toFixed(2)} vs Opponent: $${opponentValue.toFixed(2)}`);
    } else {
      toast.error(`You lost! Your team: $${myValue.toFixed(2)} vs Opponent: $${opponentValue.toFixed(2)}`);
    }

    setGameStarted(false);
    fetchItems();
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      
      <div className="flex-1 ml-64 mr-96">
        <TopBar />
        
        <main className="p-8 pt-24">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="relative h-64 rounded-xl overflow-hidden border border-border shadow-glow">
              <img src={draftBattleImg} alt="Draft Battle" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
              <div className="absolute bottom-4 left-4">
                <h1 className="text-4xl font-bold text-foreground">Draft Battle</h1>
                <p className="text-muted-foreground">Draft the best team to win!</p>
              </div>
            </div>

            {!gameStarted ? (
              <Card className="p-6 border-border shadow-glow">
                <div className="text-center space-y-4">
                  <h2 className="text-2xl font-bold text-foreground">Entry Fee: $10</h2>
                  <p className="text-muted-foreground">Winner takes $18</p>
                  <Button onClick={startGame} className="border border-primary/20 shadow-glow">
                    Start Draft Battle
                  </Button>
                  
                  <div className="mt-6 p-4 bg-card/50 rounded-lg border border-border text-left">
                    <h3 className="font-bold text-foreground mb-2">How to Play:</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Pay $10 to enter the draft</li>
                      <li>• Pick 3 items for your team</li>
                      <li>• Opponent picks 3 items too</li>
                      <li>• Team with highest total value wins $18!</li>
                      <li>• Choose strategically!</li>
                    </ul>
                  </div>
                </div>
              </Card>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-4 border-primary shadow-glow">
                    <h3 className="font-bold text-foreground mb-2">Your Team</h3>
                    <div className="space-y-2">
                      {myTeam.map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-card/50 rounded">
                          <span className="text-sm text-foreground">{item.name}</span>
                          <span className="text-sm text-primary">${item.value.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 text-right font-bold text-foreground">
                      Total: ${myTeam.reduce((sum, item) => sum + item.value, 0).toFixed(2)}
                    </div>
                  </Card>

                  <Card className="p-4 border-border shadow-glow">
                    <h3 className="font-bold text-foreground mb-2">Opponent Team</h3>
                    <div className="space-y-2">
                      {opponentTeam.map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-card/50 rounded">
                          <span className="text-sm text-foreground">{item.name}</span>
                          <span className="text-sm text-primary">${item.value.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 text-right font-bold text-foreground">
                      Total: ${opponentTeam.reduce((sum, item) => sum + item.value, 0).toFixed(2)}
                    </div>
                  </Card>
                </div>

                <Card className="p-4 border-border shadow-glow">
                  <h3 className="font-bold text-foreground mb-4">
                    {isMyTurn ? "Your turn - Pick an item" : "Opponent is picking..."}
                  </h3>
                  <div className="grid grid-cols-4 gap-3">
                    {availableItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => draftItem(item)}
                        disabled={!isMyTurn}
                        className="p-3 bg-card border border-border rounded-lg hover:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="text-sm font-medium text-foreground">{item.name}</div>
                        <div className="text-xs text-primary">${item.value.toFixed(2)}</div>
                      </button>
                    ))}
                  </div>
                </Card>
              </div>
            )}
          </div>
        </main>
      </div>

      <LiveChat />
    </div>
  );
}
