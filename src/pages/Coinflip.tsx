import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { LiveChat } from "@/components/LiveChat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Coins } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CoinflipGame {
  id: string;
  creator_id: string;
  joiner_id: string | null;
  bet_amount: string;
  creator_side: string;
  winner_id: string | null;
  result: string | null;
  status: string;
  created_at: string;
  profiles: any;
}

const Coinflip = () => {
  const [games, setGames] = useState<CoinflipGame[]>([]);
  const [betAmount, setBetAmount] = useState("");
  const [selectedSide, setSelectedSide] = useState<'heads' | 'tails'>('heads');
  const [user, setUser] = useState<any>(null);
  const [userBalance, setUserBalance] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkUser();
    fetchGames();
    
    const gamesChannel = supabase
      .channel('coinflip-games-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coinflip_games' }, () => {
        fetchGames();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(gamesChannel);
    };
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
      setUserBalance(parseFloat(String(profile.balance)) || 0);
    }
  };

  const fetchGames = async () => {
    const { data, error } = await supabase
      .from("coinflip_games")
      .select(`
        *,
        profiles!coinflip_games_creator_id_fkey(username)
      `)
      .eq("status", "waiting")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching games:", error);
      return;
    }

    setGames(data as any || []);
  };

  const createGame = async () => {
    if (!user) {
      toast({ title: "Please login first", variant: "destructive" });
      return;
    }

    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Invalid bet amount", variant: "destructive" });
      return;
    }

    if (amount > userBalance) {
      toast({ title: "Insufficient balance", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("coinflip_games").insert({
      creator_id: user.id,
      bet_amount: amount,
      creator_side: selectedSide,
      status: 'waiting'
    });

    if (error) {
      toast({ title: "Error creating game", description: error.message, variant: "destructive" });
      return;
    }

    // Deduct balance
    await supabase.rpc('update_user_balance', {
      p_user_id: user.id,
      p_amount: -amount,
      p_type: 'loss',
      p_game_type: 'coinflip',
      p_description: 'Created coinflip game'
    });

    setBetAmount("");
    toast({ title: "Game created!", description: "Waiting for opponent..." });
    checkUser();
  };

  const joinGame = async (game: CoinflipGame) => {
    if (!user) {
      toast({ title: "Please login first", variant: "destructive" });
      return;
    }

    if (game.creator_id === user.id) {
      toast({ title: "Cannot join your own game", variant: "destructive" });
      return;
    }

    if (parseFloat(game.bet_amount) > userBalance) {
      toast({ title: "Insufficient balance", variant: "destructive" });
      return;
    }

    // Determine winner (50/50 chance)
    const result: 'heads' | 'tails' = Math.random() < 0.5 ? 'heads' : 'tails';
    const winnerId = result === game.creator_side ? game.creator_id : user.id;
    const betAmt = parseFloat(game.bet_amount);
    const winAmount = betAmt * 2 * 0.95; // 5% house edge

    // Update game
    const { error: updateError } = await supabase
      .from("coinflip_games")
      .update({
        joiner_id: user.id,
        winner_id: winnerId,
        result: result,
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq("id", game.id);

    if (updateError) {
      toast({ title: "Error joining game", description: updateError.message, variant: "destructive" });
      return;
    }

    // Deduct joiner's balance
    await supabase.rpc('update_user_balance', {
      p_user_id: user.id,
      p_amount: -betAmt,
      p_type: 'loss',
      p_game_type: 'coinflip',
      p_game_id: game.id,
      p_description: 'Joined coinflip game'
    });

    // Credit winner
    await supabase.rpc('update_user_balance', {
      p_user_id: winnerId,
      p_amount: winAmount,
      p_type: 'win',
      p_game_type: 'coinflip',
      p_game_id: game.id,
      p_description: `Won coinflip - ${result}`
    });

    toast({
      title: winnerId === user.id ? "You won! 🎉" : "You lost 😢",
      description: `Result: ${result.toUpperCase()}`
    });

    checkUser();
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
                <Coins className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Coinflip</h1>
                <p className="text-muted-foreground">50/50 chance to double your bet</p>
              </div>
            </div>

            {/* Create Game Section */}
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Create New Game</h2>
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

                <div>
                  <label className="text-sm font-medium mb-2 block">Choose Side</label>
                  <div className="flex gap-3">
                    <Button
                      variant={selectedSide === 'heads' ? 'default' : 'outline'}
                      className="flex-1"
                      onClick={() => setSelectedSide('heads')}
                    >
                      Heads
                    </Button>
                    <Button
                      variant={selectedSide === 'tails' ? 'default' : 'outline'}
                      className="flex-1"
                      onClick={() => setSelectedSide('tails')}
                    >
                      Tails
                    </Button>
                  </div>
                </div>

                <Button onClick={createGame} className="w-full" size="lg">
                  Create Game
                </Button>
              </div>
            </Card>

            {/* Active Games */}
            <div>
              <h2 className="text-xl font-bold mb-4">Active Games</h2>
              {games.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">No active games. Create one to get started!</p>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {games.map((game) => (
                    <Card key={game.id} className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="font-medium">{game.profiles?.username || 'Unknown'}</p>
                          <p className="text-2xl font-bold">${parseFloat(game.bet_amount).toFixed(2)}</p>
                          <p className="text-sm text-muted-foreground">
                            Chose: {game.creator_side.toUpperCase()}
                          </p>
                        </div>
                        <Button
                          onClick={() => joinGame(game)}
                          disabled={game.creator_id === user?.id}
                          size="lg"
                        >
                          Join Game
                        </Button>
                      </div>
                    </Card>
                  ))}
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

export default Coinflip;
