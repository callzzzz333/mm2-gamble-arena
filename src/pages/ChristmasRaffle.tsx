import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { LiveChat } from "@/components/LiveChat";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Gift, Snowflake, Trophy, Ticket, Check, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

interface UserItem {
  id: string;
  item_id: string;
  quantity: number;
  items: {
    id: string;
    name: string;
    value: number;
    rarity: string;
    image_url: string;
  };
}

interface LeaderboardEntry {
  user_id: string;
  total_tickets: number;
  profiles: {
    username: string;
    avatar_url: string;
  };
}

interface RaffleData {
  id: string;
  year: number;
  end_date: string;
  status: string;
  winner_id: string | null;
  total_prize_value: number;
  prize_items: any;
}

const ChristmasRaffle = () => {
  const [inventory, setInventory] = useState<UserItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Map<string, number>>(new Map());
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isExchanging, setIsExchanging] = useState(false);
  const [userTickets, setUserTickets] = useState(0);
  const [raffleData, setRaffleData] = useState<RaffleData | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchInventory();
      fetchUserTickets();
    }
    fetchLeaderboard();
    fetchRaffleData();

    const ticketsChannel = supabase
      .channel("raffle-tickets-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "christmas_raffle_tickets",
        },
        () => {
          fetchLeaderboard();
          if (user) fetchUserTickets();
        }
      )
      .subscribe();

    const raffleChannel = supabase
      .channel("raffle-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "christmas_raffle",
        },
        () => {
          fetchRaffleData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ticketsChannel);
      supabase.removeChannel(raffleChannel);
    };
  }, [user]);

  useEffect(() => {
    if (!raffleData) return;
    
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const endTime = new Date(raffleData.end_date).getTime();
      const distance = endTime - now;

      if (distance < 0) {
        setTimeLeft("🎁 Drawing Winner...");
        clearInterval(timer);
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    }, 1000);

    return () => clearInterval(timer);
  }, [raffleData]);

  const fetchInventory = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("user_items")
        .select("*, items(*)")
        .eq("user_id", user.id)
        .order("acquired_at", { ascending: false });

      if (error) throw error;
      setInventory(data || []);
    } catch (error) {
      console.error("Error fetching inventory:", error);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from("christmas_raffle_tickets")
        .select("user_id, total_tickets")
        .order("total_tickets", { ascending: false })
        .limit(10);

      if (error) throw error;
      
      // Fetch profiles separately
      const leaderboardWithProfiles = await Promise.all(
        (data || []).map(async (entry) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("username, avatar_url")
            .eq("id", entry.user_id)
            .single();
          
          return {
            ...entry,
            profiles: profile || { username: "Unknown", avatar_url: null }
          };
        })
      );
      
      setLeaderboard(leaderboardWithProfiles);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    }
  };

  const fetchUserTickets = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("christmas_raffle_tickets")
        .select("total_tickets")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      setUserTickets(data?.total_tickets || 0);
    } catch (error) {
      console.error("Error fetching user tickets:", error);
    }
  };

  const fetchRaffleData = async () => {
    try {
      const { data, error } = await supabase
        .from("christmas_raffle")
        .select("*")
        .eq("year", 2024)
        .single();

      if (error) throw error;
      setRaffleData(data);
    } catch (error) {
      console.error("Error fetching raffle data:", error);
    }
  };

  const toggleItemSelection = (itemId: string, maxQuantity: number) => {
    const newSelected = new Map(selectedItems);
    const currentQty = newSelected.get(itemId) || 0;
    
    if (currentQty < maxQuantity) {
      newSelected.set(itemId, currentQty + 1);
    } else {
      newSelected.delete(itemId);
    }
    
    setSelectedItems(newSelected);
  };

  const calculateTotalValue = () => {
    let total = 0;
    selectedItems.forEach((quantity, itemId) => {
      const item = inventory.find(i => i.item_id === itemId);
      if (item) {
        total += Number(item.items.value) * quantity;
      }
    });
    return total;
  };

  const calculateTickets = () => {
    return Math.floor(calculateTotalValue() / 5);
  };

  const handleExchange = async () => {
    if (!user) {
      toast({ title: "Please login to exchange items", variant: "destructive" });
      return;
    }

    if (selectedItems.size === 0) {
      toast({ title: "Please select items to exchange", variant: "destructive" });
      return;
    }

    setIsExchanging(true);
    try {
      // Get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        toast({ 
          title: "Authentication Error", 
          description: "Please log out and log back in", 
          variant: "destructive" 
        });
        return;
      }

      const items = Array.from(selectedItems.entries()).map(([item_id, quantity]) => ({
        item_id,
        quantity
      }));

      const { data, error } = await supabase.functions.invoke("christmas-raffle-exchange", {
        body: { items },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      toast({ 
        title: `🎟️ Exchange successful!`, 
        description: `Earned ${data.ticketsEarned} tickets from $${data.totalValue.toFixed(2)} worth of items` 
      });
      
      setSelectedItems(new Map());
      fetchInventory();
      fetchUserTickets();
      fetchLeaderboard();
    } catch (error: any) {
      console.error("Exchange error:", error);
      toast({ title: "Error exchanging items", description: error.message, variant: "destructive" });
    } finally {
      setIsExchanging(false);
    }
  };

  const getRarityColor = (rarity: string) => {
    const colors: any = {
      Godly: "bg-red-500/20 text-red-500 border-red-500/30",
      Ancient: "bg-purple-500/20 text-purple-500 border-purple-500/30",
      Legendary: "bg-orange-500/20 text-orange-500 border-orange-500/30",
      Rare: "bg-blue-500/20 text-blue-500 border-blue-500/30",
      Uncommon: "bg-green-500/20 text-green-500 border-green-500/30",
      Common: "bg-gray-500/20 text-gray-500 border-gray-500/30",
    };
    return colors[rarity] || "bg-gray-500/20 text-gray-500 border-gray-500/30";
  };

  const totalValue = calculateTotalValue();
  const ticketsToEarn = calculateTickets();

  return (
    <div className="min-h-screen w-full flex">
      <Sidebar />

      <div className="flex-1 ml-64 mr-96">
        <TopBar />

        <main className="pt-16 px-12 py-8">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div className="relative flex items-center gap-3 overflow-hidden rounded-xl p-6 bg-gradient-to-r from-blue-500/10 via-white/5 to-blue-500/10 border border-blue-500/20">
              <Snowflake className="w-12 h-12 text-blue-300 absolute top-2 left-4 animate-spin" style={{ animationDuration: "10s" }} />
              <Snowflake className="w-8 h-8 text-blue-200 absolute top-8 right-12 animate-spin" style={{ animationDuration: "15s" }} />
              <Snowflake className="w-6 h-6 text-blue-400 absolute bottom-4 right-24 animate-spin" style={{ animationDuration: "12s" }} />
              
              <div className="relative z-10 w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-white/20 flex items-center justify-center shadow-glow">
                <Ticket className="w-7 h-7 text-white" />
              </div>
              <div className="relative z-10 flex-1">
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  🎄 Christmas Raffle 🎟️
                </h1>
                <p className="text-muted-foreground">Exchange items for tickets • $5 = 1 ticket</p>
              </div>
              {raffleData && (
                <div className="relative z-10 text-right">
                  <div className="flex items-center gap-2 text-blue-400 mb-1">
                    <Clock className="w-5 h-5" />
                    <span className="text-sm font-medium">Draw In:</span>
                  </div>
                  <div className="text-2xl font-bold">{timeLeft}</div>
                </div>
              )}
            </div>

            {/* Prize Pool */}
            {raffleData && (
              <Card className="p-6 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Gift className="w-6 h-6 text-yellow-400" />
                    Grand Prize Pool
                  </h2>
                  {raffleData.status === 'completed' && raffleData.winner_id && (
                    <Badge className="bg-green-500">Winner Drawn!</Badge>
                  )}
                </div>
                <div className="text-center py-4">
                  <p className="text-4xl font-bold text-yellow-400 mb-2">
                    ${raffleData.total_prize_value.toFixed(2)}
                  </p>
                  <p className="text-muted-foreground">
                    {Array.isArray(raffleData.prize_items) ? raffleData.prize_items.length : 0} items in the prize pool
                  </p>
                </div>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Inventory & Exchange */}
              <div className="lg:col-span-2 space-y-6">
                {/* User Tickets Card */}
                {user && (
                  <Card className="p-6 bg-gradient-to-br from-blue-500/10 to-white/5 border-blue-500/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Ticket className="w-8 h-8 text-blue-400" />
                        <div>
                          <p className="text-sm text-muted-foreground">Your Tickets</p>
                          <p className="text-3xl font-bold text-blue-400">{userTickets}</p>
                        </div>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Inventory Card */}
                <Card className="p-6">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Gift className="w-6 h-6 text-primary" />
                    Your Inventory
                  </h2>

                  {!user ? (
                    <div className="text-center py-12">
                      <Ticket className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Please login to exchange items for tickets</p>
                    </div>
                  ) : inventory.length === 0 ? (
                    <div className="text-center py-12">
                      <Gift className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No items in your inventory</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[500px] pr-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {inventory.map((userItem) => {
                          const selected = selectedItems.get(userItem.item_id) || 0;
                          const isSelected = selected > 0;

                          return (
                            <Card
                              key={userItem.id}
                              className={`p-3 cursor-pointer transition-all hover:scale-105 ${
                                isSelected ? "ring-2 ring-blue-500 bg-blue-500/10" : ""
                              }`}
                              onClick={() => toggleItemSelection(userItem.item_id, userItem.quantity)}
                            >
                              <div className="relative">
                                <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-card border border-border mb-2">
                                  {userItem.items.image_url && (
                                    <img
                                      src={userItem.items.image_url}
                                      alt={userItem.items.name}
                                      className="w-full h-full object-cover"
                                    />
                                  )}
                                </div>
                                {isSelected && (
                                  <div className="absolute top-2 right-2 bg-blue-500 rounded-full p-1">
                                    <Check className="w-4 h-4 text-white" />
                                  </div>
                                )}
                              </div>
                              <div className="space-y-1">
                                <p className="text-sm font-medium truncate">{userItem.items.name}</p>
                                <div className="flex items-center justify-between">
                                  <Badge className={getRarityColor(userItem.items.rarity)} variant="outline">
                                    {userItem.items.rarity}
                                  </Badge>
                                  <span className="text-xs font-bold text-primary">
                                    ${userItem.items.value}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <Badge variant="secondary" className="text-xs">
                                    x{userItem.quantity}
                                  </Badge>
                                  {isSelected && (
                                    <Badge className="text-xs bg-blue-500">
                                      Selected: {selected}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  )}
                </Card>

                {/* Exchange Summary */}
                {user && selectedItems.size > 0 && (
                  <Card className="p-6 bg-gradient-to-br from-blue-500/5 to-purple-500/5 border-blue-500/20">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Total Value:</span>
                        <span className="text-xl font-bold">${totalValue.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Tickets to Earn:</span>
                        <span className="text-2xl font-bold text-blue-400">{ticketsToEarn}</span>
                      </div>
                      <Button
                        onClick={handleExchange}
                        disabled={isExchanging || ticketsToEarn === 0}
                        className="w-full h-12 text-lg font-bold bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                      >
                        {isExchanging ? "Exchanging..." : `🎟️ Exchange for ${ticketsToEarn} Tickets`}
                      </Button>
                    </div>
                  </Card>
                )}
              </div>

              {/* Right: Leaderboard */}
              <div>
                <Card className="p-6 sticky top-24">
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Trophy className="w-6 h-6 text-yellow-400" />
                    Top Ticket Holders
                  </h2>

                  <ScrollArea className="h-[600px]">
                    {leaderboard.length === 0 ? (
                      <div className="text-center py-12">
                        <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">No entries yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {leaderboard.map((entry, index) => (
                          <Card
                            key={entry.user_id}
                            className={`p-4 ${
                              index === 0
                                ? "bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 border-yellow-500/40"
                                : index === 1
                                ? "bg-gradient-to-r from-gray-400/20 to-gray-500/20 border-gray-400/40"
                                : index === 2
                                ? "bg-gradient-to-r from-orange-500/20 to-orange-600/20 border-orange-500/40"
                                : ""
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 font-bold">
                                {index + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold truncate">
                                  {entry.profiles?.username || "Anonymous"}
                                </p>
                                <div className="flex items-center gap-1 text-blue-400">
                                  <Ticket className="w-4 h-4" />
                                  <span className="text-sm font-bold">{entry.total_tickets}</span>
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>

      <LiveChat />
    </div>
  );
};

export default ChristmasRaffle;