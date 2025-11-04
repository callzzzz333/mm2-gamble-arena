import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { LiveChat } from "@/components/LiveChat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface JackpotEntry {
  id: string;
  user_id: string;
  bet_amount: string;
  win_chance: string;
  profiles: any;
}

interface JackpotGame {
  id: string;
  total_pot: string;
  status: string;
  draw_at: string | null;
}

const Jackpot = () => {
  const [currentGame, setCurrentGame] = useState<JackpotGame | null>(null);
  const [entries, setEntries] = useState<JackpotEntry[]>([]);
  const [betAmount, setBetAmount] = useState("");
  const [user, setUser] = useState<any>(null);
  const [userBalance, setUserBalance] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkUser();
    fetchCurrentGame();

    const interval = setInterval(() => {
      if (currentGame?.draw_at) {
        const remaining = Math.max(0, new Date(currentGame.draw_at).getTime() - Date.now());
        setTimeLeft(Math.floor(remaining / 1000));
        
        if (remaining <= 0 && currentGame.status === 'active') {
          drawWinner();
        }
      }
    }, 1000);

    const channel = supabase
      .channel('jackpot-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jackpot_games' }, () => {
        fetchCurrentGame();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jackpot_entries' }, () => {
        fetchCurrentGame();
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [currentGame]);

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
      setUserBalance(parseFloat(String(profile.balance)) || 0);
    }
  };

  const fetchCurrentGame = async () => {
    const { data: game } = await supabase
      .from("jackpot_games")
      .select("*")
      .in("status", ["active", "rolling"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!game) {
      // Create new game
      const drawTime = new Date(Date.now() + 120000); // 2 minutes
      const { data: newGame } = await supabase
        .from("jackpot_games")
        .insert({
          status: 'active',
          draw_at: drawTime.toISOString()
        })
        .select()
        .single();
      
      setCurrentGame(newGame as any);
      setEntries([]);
    } else {
      setCurrentGame(game as any);
      
      const { data: gameEntries } = await supabase
        .from("jackpot_entries")
        .select(`
          *,
          profiles!jackpot_entries_user_id_fkey(username)
        `)
        .eq("game_id", game.id);
      
      setEntries(gameEntries as any || []);
    }
  };

  const enterJackpot = async () => {
    if (!user || !currentGame) return;

    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Invalid bet amount", variant: "destructive" });
      return;
    }

    if (amount > userBalance) {
      toast({ title: "Insufficient balance", variant: "destructive" });
      return;
    }

    // Insert entry
    const { error: entryError } = await supabase
      .from("jackpot_entries")
      .insert({
        game_id: currentGame.id,
        user_id: user.id,
        bet_amount: amount,
        win_chance: 0
      });

    if (entryError) {
      toast({ title: "Error entering jackpot", description: entryError.message, variant: "destructive" });
      return;
    }

    // Update game total
    const { error: gameError } = await supabase
      .from("jackpot_games")
      .update({ total_pot: parseFloat(currentGame.total_pot) + amount })
      .eq("id", currentGame.id);

    if (gameError) {
      toast({ title: "Error updating game", variant: "destructive" });
      return;
    }

    // Deduct balance
    await supabase.rpc('update_user_balance', {
      p_user_id: user.id,
      p_amount: -amount,
      p_type: 'loss',
      p_game_type: 'jackpot',
      p_game_id: currentGame.id,
      p_description: 'Entered jackpot'
    });

    setBetAmount("");
    toast({ title: "Entered jackpot!", description: `Bet $${amount.toFixed(2)}` });
    checkUser();
  };

  const drawWinner = async () => {
    if (!currentGame || entries.length === 0) return;

    // Calculate win chances
    const totalPot = parseFloat(currentGame.total_pot);
    const updatedEntries = entries.map(entry => ({
      ...entry,
      win_chance: (parseFloat(entry.bet_amount) / totalPot) * 100
    }));

    // Pick winner based on weighted probability
    const random = Math.random() * 100;
    let cumulative = 0;
    let winnerId = entries[0].user_id;

    for (const entry of updatedEntries) {
      cumulative += entry.win_chance;
      if (random <= cumulative) {
        winnerId = entry.user_id;
        break;
      }
    }

    const winAmount = totalPot * 0.95; // 5% house edge

    // Update game
    await supabase
      .from("jackpot_games")
      .update({
        winner_id: winnerId,
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq("id", currentGame.id);

    // Credit winner
    await supabase.rpc('update_user_balance', {
      p_user_id: winnerId,
      p_amount: winAmount,
      p_type: 'win',
      p_game_type: 'jackpot',
      p_game_id: currentGame.id,
      p_description: 'Won jackpot'
    });

    if (winnerId === user?.id) {
      toast({ title: "YOU WON THE JACKPOT! 🎉", description: `Won $${winAmount.toFixed(2)}` });
    }

    checkUser();
    fetchCurrentGame();
  };

  return (
    <div className="min-h-screen w-full flex">
      <Sidebar />
      
      <div className="flex-1 ml-64 mr-96">
        <TopBar />
        
        <main className="pt-16 px-12 py-8">
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow">
                <Trophy className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Jackpot</h1>
                <p className="text-muted-foreground">Win the entire pot based on your bet amount</p>
              </div>
            </div>

            {/* Jackpot Pot */}
            <Card className="p-8 text-center">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Current Pot</p>
                  <p className="text-5xl font-bold">${parseFloat(currentGame?.total_pot || "0").toFixed(2)}</p>
                </div>
                
                {currentGame?.status === 'active' && timeLeft > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Draw in: {timeLeft}s</p>
                    <Progress value={(120 - timeLeft) / 120 * 100} className="h-2" />
                  </div>
                )}

                {currentGame?.status === 'rolling' && (
                  <p className="text-xl font-semibold animate-pulse">Drawing winner...</p>
                )}
              </div>
            </Card>

            {/* Enter Jackpot */}
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Enter Jackpot</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Bet Amount ($)</label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Your balance: ${userBalance.toFixed(2)}
                  </p>
                </div>

                <Button onClick={enterJackpot} className="w-full" size="lg">
                  Enter Jackpot
                </Button>
              </div>
            </Card>

            {/* Participants */}
            <div>
              <h2 className="text-xl font-bold mb-4">Participants ({entries.length})</h2>
              {entries.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">No participants yet. Be the first!</p>
                </Card>
              ) : (
                <div className="space-y-2">
                  {entries.map((entry) => {
                    const chance = currentGame ? (parseFloat(entry.bet_amount) / parseFloat(currentGame.total_pot)) * 100 : 0;
                    return (
                      <Card key={entry.id} className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{entry.profiles?.username || 'Unknown'}</span>
                          <span className="text-lg font-bold">${parseFloat(entry.bet_amount).toFixed(2)}</span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Win Chance</span>
                            <span>{chance.toFixed(2)}%</span>
                          </div>
                          <Progress value={chance} className="h-2" />
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      <LiveChat />
    </div>
  );
};

export default Jackpot;
