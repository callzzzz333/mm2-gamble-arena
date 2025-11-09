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
                tables.map((table) => (
                  <Card key={table.id} className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={table.status === "waiting" ? "default" : "secondary"}>
                            {table.status === "waiting" ? "Waiting" : "In Progress"}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            Bet: <span className="text-primary font-bold">${table.bet_amount}</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="w-4 h-4" />
                          {(players[table.id] || []).length} / {table.max_players} players
                        </div>
                      </div>
                      
                      {table.status === "waiting" && (
                        <Button
                          onClick={() => joinTable(table.id, table.bet_amount)}
                          disabled={loading || (players[table.id] || []).some(p => p.user_id === user?.id)}
                        >
                          Join Table
                        </Button>
                      )}
                    </div>

                    {/* Players */}
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      {(players[table.id] || []).map((player) => (
                        <Card key={player.id} className="p-4 bg-muted/50">
                          <div className="flex items-center gap-2 mb-2">
                            {player.profiles.avatar_url && (
                              <img
                                src={player.profiles.avatar_url}
                                alt={player.profiles.username}
                                className="w-8 h-8 rounded-full"
                              />
                            )}
                            <p className="font-semibold text-sm">{player.profiles.username}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">
                              Score: <span className="font-bold text-foreground">{player.score}</span>
                            </p>
                            <div className="flex gap-1">
                              {(player.hand || []).map((card: any, idx: number) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {getCardDisplay(card)}
                                </Badge>
                              ))}
                            </div>
                            <Badge
                              variant={player.status === "bust" ? "destructive" : "default"}
                              className="text-xs"
                            >
                              {player.status}
                            </Badge>
                          </div>
                        </Card>
                      ))}
                    </div>

                    {/* Dealer */}
                    {table.status === "in_progress" && Array.isArray(table.dealer_hand) && table.dealer_hand.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-border">
                        <p className="text-sm font-bold mb-2">Dealer</p>
                        <div className="flex gap-2">
                          {table.dealer_hand.map((card: any, idx: number) => (
                            <Badge key={idx} variant="secondary">
                              {getCardDisplay(card)}
                            </Badge>
                          ))}
                          <span className="text-sm text-muted-foreground ml-2">
                            Score: {table.dealer_score}
                          </span>
                        </div>
                      </div>
                    )}
                  </Card>
                ))
              )}
            </div>
          </div>
        </main>
      </div>
      <LiveChat />
    </div>
  );
}
