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
import { Crown } from "lucide-react";
import kingOfHillImg from "@/assets/king-of-hill.jpg";

interface KingEntry {
  user_id: string;
  bet_amount: number;
  time_remaining: number;
  profiles: {
    username: string;
  };
}

export default function KingOfHill() {
  const navigate = useNavigate();
  const [betAmount, setBetAmount] = useState<string>("");
  const [user, setUser] = useState<any>(null);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [currentKing, setCurrentKing] = useState<KingEntry | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    checkUser();
    fetchCurrentKing();
    
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0) {
          checkWinner();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
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

  const fetchCurrentKing = async () => {
    // This is a simplified version - you'd need a proper table for this
    // For now, we'll just show the concept
    setTimeLeft(120); // 2 minutes
  };

  const claimThrone = async () => {
    const amount = parseFloat(betAmount);
    if (!amount || amount <= 0) {
      toast.error("Please enter a valid bet amount");
      return;
    }

    if (currentKing && amount <= currentKing.bet_amount) {
      toast.error(`Must bet more than current king ($${currentKing.bet_amount})`);
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
      p_game_type: "king_of_hill",
      p_description: "King of the Hill bet"
    });

    if (error || !data) {
      toast.error("Failed to claim throne");
      return;
    }

    setUserBalance(prev => prev - amount);
    setTimeLeft(120); // Reset timer
    toast.success("You are now the King! Defend your throne for 2 minutes to win!");
  };

  const checkWinner = async () => {
    if (currentKing) {
      const winAmount = currentKing.bet_amount * 1.8;
      toast.success(`${currentKing.profiles.username} won $${winAmount.toFixed(2)}!`);
      fetchCurrentKing();
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      
      <div className="flex-1 ml-64 mr-96">
        <TopBar />
        
        <main className="p-8 pt-24">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="relative h-64 rounded-xl overflow-hidden border border-border shadow-glow">
              <img src={kingOfHillImg} alt="King of the Hill" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
              <div className="absolute bottom-4 left-4">
                <h1 className="text-4xl font-bold text-foreground">King of the Hill</h1>
                <p className="text-muted-foreground">Claim the throne and defend it to win!</p>
              </div>
            </div>

            <Card className="p-6 border-border shadow-glow">
              <div className="space-y-6">
                <div className="text-center">
                  <Crown className="w-16 h-16 text-primary mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-foreground">Current King</h2>
                  <p className="text-muted-foreground">
                    {currentKing ? currentKing.profiles.username : "No King Yet"}
                  </p>
                  {currentKing && (
                    <div className="mt-2 text-xl font-bold text-primary">
                      ${currentKing.bet_amount.toFixed(2)}
                    </div>
                  )}
                  <div className="mt-4 text-3xl font-bold text-foreground">
                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground">
                      Bet Amount (${currentKing ? `Must be > $${currentKing.bet_amount}` : 'Any amount'})
                    </label>
                    <Input
                      type="number"
                      value={betAmount}
                      onChange={(e) => setBetAmount(e.target.value)}
                      placeholder="Enter bet amount"
                      className="mt-1"
                    />
                  </div>
                  <Button onClick={claimThrone} className="w-full border border-primary/20 shadow-glow">
                    Claim Throne
                  </Button>
                </div>

                <div className="p-4 bg-card/50 rounded-lg border border-border">
                  <h3 className="font-bold text-foreground mb-2">How to Play:</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Bet to become the King of the Hill</li>
                    <li>• Your bet must be higher than the current King</li>
                    <li>• When someone bets more, they become the new King</li>
                    <li>• If you're still King when timer hits 0, you win 1.8x your bet!</li>
                    <li>• Previous kings lose their bet</li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        </main>
      </div>

      <LiveChat />
    </div>
  );
}
