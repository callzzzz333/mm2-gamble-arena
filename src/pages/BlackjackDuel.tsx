import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { LiveChat } from "@/components/LiveChat";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Spade, Users, Trophy, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface BlackjackTable {
  id: string;
  status: string;
  max_players: number;
  bet_amount: number;
  dealer_hand: any;
  dealer_score: number;
  created_at: string;
}

interface BlackjackPlayer {
  id: string;
  table_id: string;
  user_id: string;
  hand: any;
  score: number;
  status: string;
  bet_amount: number;
  won: boolean | null;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

export default function BlackjackDuel() {
  const [tables, setTables] = useState<BlackjackTable[]>([]);
  const [players, setPlayers] = useState<Record<string, BlackjackPlayer[]>>({});
  const [betAmount, setBetAmount] = useState("10");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchTables();
    
    const tablesChannel = supabase
      .channel("blackjack-tables")
      .on("postgres_changes", { event: "*", schema: "public", table: "blackjack_tables" }, () => {
        fetchTables();
      })
      .subscribe();

    const playersChannel = supabase
      .channel("blackjack-players")
      .on("postgres_changes", { event: "*", schema: "public", table: "blackjack_players" }, () => {
        fetchTables();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(tablesChannel);
      supabase.removeChannel(playersChannel);
    };
  }, []);

  const fetchTables = async () => {
    const { data: tablesData } = await supabase
      .from("blackjack_tables")
      .select("*")
      .in("status", ["waiting", "in_progress"])
      .order("created_at", { ascending: false });

    if (tablesData) {
      setTables(tablesData as any);
      
      // Fetch players for each table
      const playersPromises = tablesData.map(async (table) => {
        const { data: playersData } = await supabase
          .from("blackjack_players")
          .select("*")
          .eq("table_id", table.id);
        
        // Fetch profiles separately
        if (playersData) {
          const playersWithProfiles = await Promise.all(
            playersData.map(async (player) => {
              const { data: profile } = await supabase
                .from("profiles")
                .select("username, avatar_url")
                .eq("id", player.user_id)
                .single();
              
              return {
                ...player,
                profiles: profile || { username: "Unknown", avatar_url: null }
              };
            })
          );
          return { tableId: table.id, players: playersWithProfiles };
        }
        
        return { tableId: table.id, players: [] };
      });
      
      const playersResults = await Promise.all(playersPromises);
      const playersMap = playersResults.reduce((acc, { tableId, players }) => {
        acc[tableId] = players as any;
        return acc;
      }, {} as Record<string, BlackjackPlayer[]>);
      
      setPlayers(playersMap);
    }
  };

  const createTable = async () => {
    if (!user) {
      toast({ title: "Please login first", variant: "destructive" });
      return;
    }

    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount < 1) {
      toast({ title: "Invalid bet amount", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data: table, error } = await supabase
        .from("blackjack_tables")
        .insert({
          bet_amount: amount,
          max_players: 6,
          status: "waiting",
        })
        .select()
        .single();

      if (error) throw error;
      
      await joinTable(table.id, amount);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const joinTable = async (tableId: string, amount: number) => {
    if (!user) {
      toast({ title: "Please login first", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase
        .from("blackjack_players")
        .insert({
          table_id: tableId,
          user_id: user.id,
          bet_amount: amount,
          hand: [],
          score: 0,
        });

      if (error) throw error;
      
      toast({ title: "Joined table successfully!" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const getCardDisplay = (card: any) => {
    if (!card) return "??";
    return `${card.rank}${card.suit}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="ml-64 mr-96">
        <TopBar />
        <main className="p-8 pt-24">
          <div className="max-w-6xl mx-auto space-y-8">
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center gap-2">
                <Spade className="w-10 h-10" />
                Blackjack Duels
              </h1>
              <p className="text-muted-foreground">
                Join a live table and compete against other players. Closest to 21 wins!
              </p>
            </div>

            {/* Create Table */}
            <Card className="p-6 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30">
              <h2 className="text-xl font-bold mb-4">Create New Table</h2>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    placeholder="Bet amount ($)"
                    min="1"
                    step="1"
                  />
                </div>
                <Button
                  onClick={createTable}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Table
                </Button>
              </div>
            </Card>

            {/* Active Tables */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Active Tables</h2>
              {tables.length === 0 ? (
                <Card className="p-12 text-center">
                  <Spade className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No active tables. Create one to start!</p>
                </Card>
              ) : (
                tables.map((table) => {
                  const tablePlayers = players[table.id] || [];
                  const totalPot = tablePlayers.reduce((sum, p) => sum + Number(p.bet_amount), 0);
                  
                  return (
                    <Card key={table.id} className="p-8 bg-gradient-to-b from-green-900/20 to-background border-green-500/30">
                      {/* Table Header */}
                      <div className="flex items-start justify-between mb-6">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <Badge variant={table.status === "waiting" ? "default" : "secondary"} className="text-sm">
                              {table.status === "waiting" ? "⏳ Waiting" : "🎲 In Progress"}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              Entry: <span className="text-primary font-bold">${table.bet_amount}</span>
                            </span>
                            <span className="text-sm text-muted-foreground">
                              Total Pot: <span className="text-green-400 font-bold">${totalPot.toFixed(2)}</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Users className="w-4 h-4" />
                            {tablePlayers.length} / {table.max_players} players
                          </div>
                        </div>
                        
                        {table.status === "waiting" && (
                          <Button
                            onClick={() => joinTable(table.id, table.bet_amount)}
                            disabled={loading || tablePlayers.some(p => p.user_id === user?.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Join Table
                          </Button>
                        )}
                      </div>

                      {/* Blackjack Table Visual */}
                      <div className="relative bg-green-800/30 rounded-3xl border-4 border-green-600/50 p-8 min-h-[500px]">
                        {/* Dealer Section at Top */}
                        <div className="absolute top-8 left-1/2 -translate-x-1/2 w-64">
                          <div className="text-center mb-4">
                            <div className="inline-flex items-center gap-2 bg-background/90 px-4 py-2 rounded-full border border-border">
                              <Spade className="w-5 h-5 text-primary" />
                              <span className="font-bold text-lg">Dealer</span>
                            </div>
                          </div>
                          
                          {table.status === "in_progress" && Array.isArray(table.dealer_hand) && table.dealer_hand.length > 0 && (
                            <div className="flex flex-col items-center gap-3 animate-fade-in">
                              <div className="flex gap-2 flex-wrap justify-center">
                                {table.dealer_hand.map((card: any, idx: number) => (
                                  <div 
                                    key={idx}
                                    className="bg-white text-black font-bold text-lg px-4 py-6 rounded-lg shadow-lg border-2 border-gray-300 min-w-[60px] text-center animate-scale-in"
                                    style={{ animationDelay: `${idx * 0.2}s` }}
                                  >
                                    {getCardDisplay(card)}
                                  </div>
                                ))}
                              </div>
                              <Badge variant="secondary" className="text-base px-4 py-1">
                                Score: {table.dealer_score}
                              </Badge>
                            </div>
                          )}
                        </div>

                        {/* Players Around the Table */}
                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full px-8">
                          <div className="grid grid-cols-3 gap-6 max-w-5xl mx-auto">
                            {tablePlayers.map((player, index) => {
                              const isWinner = table.status === "completed" && player.won;
                              
                              return (
                                <Card 
                                  key={player.id} 
                                  className={`p-4 transition-all duration-300 ${
                                    isWinner 
                                      ? "bg-gradient-to-b from-yellow-500/20 to-background border-yellow-500 shadow-lg shadow-yellow-500/50 scale-105" 
                                      : "bg-background/90"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 mb-3">
                                    {player.profiles.avatar_url && (
                                      <img
                                        src={player.profiles.avatar_url}
                                        alt={player.profiles.username}
                                        className="w-10 h-10 rounded-full border-2 border-primary"
                                      />
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="font-bold text-sm truncate">{player.profiles.username}</p>
                                      <p className="text-xs text-muted-foreground">
                                        Bet: ${Number(player.bet_amount).toFixed(2)}
                                      </p>
                                    </div>
                                    {isWinner && <Trophy className="w-5 h-5 text-yellow-500 animate-pulse" />}
                                  </div>
                                  
                                  {/* Player Cards */}
                                  <div className="space-y-2">
                                    {Array.isArray(player.hand) && player.hand.length > 0 && (
                                      <div className="flex gap-1 flex-wrap justify-center">
                                        {player.hand.map((card: any, idx: number) => (
                                          <div
                                            key={idx}
                                            className="bg-white text-black font-bold text-sm px-3 py-4 rounded shadow-md border border-gray-300 min-w-[45px] text-center animate-scale-in"
                                            style={{ animationDelay: `${idx * 0.15}s` }}
                                          >
                                            {getCardDisplay(card)}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    
                                    <div className="flex items-center justify-between gap-2">
                                      <Badge
                                        variant={player.status === "bust" ? "destructive" : player.score === 21 ? "default" : "secondary"}
                                        className="text-xs"
                                      >
                                        {player.status === "bust" ? "💥 Bust" : player.score === 21 ? "🎯 Blackjack!" : `Score: ${player.score}`}
                                      </Badge>
                                    </div>
                                  </div>
                                </Card>
                              );
                            })}
                          </div>
                        </div>

                        {/* Center Pot Display */}
                        {table.status === "in_progress" && (
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                            <div className="bg-background/95 border-2 border-primary rounded-full px-6 py-3 shadow-xl">
                              <p className="text-xs text-muted-foreground text-center">Total Pot</p>
                              <p className="text-2xl font-bold text-primary text-center">${totalPot.toFixed(2)}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        </main>
      </div>
      <LiveChat />
    </div>
  );
}
