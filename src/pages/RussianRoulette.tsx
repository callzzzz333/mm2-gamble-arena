import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { LiveChat } from "@/components/LiveChat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import russianRouletteImg from "@/assets/russian-roulette.jpg";

export default function RussianRoulette() {
  const navigate = useNavigate();
  const [betAmount, setBetAmount] = useState<string>("");
  const [user, setUser] = useState<any>(null);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [chamber, setChamber] = useState<number>(6);
  const [roundsPlayed, setRoundsPlayed] = useState<number>(0);

  useEffect(() => {
    checkUser();
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

  const startGame = async () => {
    const amount = parseFloat(betAmount);
    if (!amount || amount <= 0) {
      toast.error("Please enter a valid bet amount");
      return;
    }

    if (amount > userBalance) {
      toast.error("Insufficient balance");
      return;
    }

    const { data, error } = await supabase.rpc("update_user_balance", {
      p_user_id: user.id,
      p_amount: -amount,
      p_type: "bet",
      p_game_type: "russian_roulette",
      p_description: "Russian Roulette bet"
    });

    if (error || !data) {
      toast.error("Failed to place bet");
      return;
    }

    setUserBalance(prev => prev - amount);
    setIsPlaying(true);
    setChamber(6);
    setRoundsPlayed(0);
    toast.success("Game started! Pull the trigger...");
  };

  const pullTrigger = async () => {
    const bulletPosition = Math.floor(Math.random() * chamber);
    const newRoundsPlayed = roundsPlayed + 1;
    setRoundsPlayed(newRoundsPlayed);

    if (bulletPosition === 0) {
      // Lost
      setIsPlaying(false);
      toast.error("💥 BANG! You lost!");
      setChamber(6);
      setRoundsPlayed(0);
    } else {
      // Survived
      const multiplier = 1 + (newRoundsPlayed * 0.5);
      const currentWinnings = parseFloat(betAmount) * multiplier;
      
      toast.success(`✓ Click! You survived! Current multiplier: ${multiplier.toFixed(1)}x ($${currentWinnings.toFixed(2)})`);
      setChamber(chamber - 1);
    }
  };

  const cashOut = async () => {
    const multiplier = 1 + (roundsPlayed * 0.5);
    const winAmount = parseFloat(betAmount) * multiplier;

    const { data, error } = await supabase.rpc("update_user_balance", {
      p_user_id: user.id,
      p_amount: winAmount,
      p_type: "win",
      p_game_type: "russian_roulette",
      p_description: `Russian Roulette win - ${multiplier.toFixed(1)}x multiplier`
    });

    if (error || !data) {
      toast.error("Failed to cash out");
      return;
    }

    setUserBalance(prev => prev + winAmount);
    setIsPlaying(false);
    setChamber(6);
    setRoundsPlayed(0);
    toast.success(`Cashed out $${winAmount.toFixed(2)}! (${multiplier.toFixed(1)}x)`);
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      
      <div className="flex-1 ml-64 mr-96">
        <TopBar />
        
        <main className="p-8 pt-24">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="relative h-64 rounded-xl overflow-hidden border border-border shadow-glow">
              <img src={russianRouletteImg} alt="Russian Roulette" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
              <div className="absolute bottom-4 left-4">
                <h1 className="text-4xl font-bold text-foreground">Russian Roulette</h1>
                <p className="text-muted-foreground">Survive to win bigger multipliers!</p>
              </div>
            </div>

            <Card className="p-6 border-border shadow-glow">
              {!isPlaying ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground">Bet Amount ($)</label>
                    <Input
                      type="number"
                      value={betAmount}
                      onChange={(e) => setBetAmount(e.target.value)}
                      placeholder="Enter bet amount"
                      className="mt-1"
                    />
                  </div>
                  <Button onClick={startGame} className="w-full border border-primary/20 shadow-glow">
                    Start Game
                  </Button>
                  
                  <div className="mt-6 p-4 bg-card/50 rounded-lg border border-border">
                    <h3 className="font-bold text-foreground mb-2">How to Play:</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Place your bet to start</li>
                      <li>• Pull the trigger - if you survive, your multiplier increases by 0.5x</li>
                      <li>• Each round, your chances of losing increase</li>
                      <li>• Cash out anytime to secure your winnings</li>
                      <li>• Get hit by the bullet and lose everything!</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <div className="text-6xl font-bold text-primary">
                      {(1 + (roundsPlayed * 0.5)).toFixed(1)}x
                    </div>
                    <p className="text-muted-foreground">Current Multiplier</p>
                    <div className="text-2xl font-bold text-foreground">
                      ${(parseFloat(betAmount) * (1 + (roundsPlayed * 0.5))).toFixed(2)}
                    </div>
                  </div>

                  <div className="flex justify-center gap-2">
                    {Array.from({ length: chamber }).map((_, i) => (
                      <div key={i} className="w-8 h-8 rounded-full border-2 border-primary bg-card" />
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Button onClick={pullTrigger} variant="destructive" className="border border-destructive/20 shadow-glow">
                      Pull Trigger
                    </Button>
                    <Button onClick={cashOut} className="border border-primary/20 shadow-glow">
                      Cash Out
                    </Button>
                  </div>

                  <div className="text-center text-sm text-muted-foreground">
                    Rounds Survived: {roundsPlayed} | Chambers Left: {chamber}
                  </div>
                </div>
              )}
            </Card>
          </div>
        </main>
      </div>

      <LiveChat />
    </div>
  );
}
