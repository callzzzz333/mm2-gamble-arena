import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { LiveChat } from "@/components/LiveChat";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Gift, Snowflake, Trophy, Ticket, Check, Clock, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useButtonAction } from "@/hooks/useButtonAction";

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
  const [userTickets, setUserTickets] = useState(0);
  const [raffleData, setRaffleData] = useState<RaffleData | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const { user } = useAuth();
  const { toast } = useToast();
  const { isProcessing, executeAction } = useButtonAction();

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
        setTimeLeft("Drawing Winner...");
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
        .eq("year", 2025)
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

    await executeAction(
      async () => {
        // Get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          throw new Error("Authentication failed. Please log out and log back in");
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
        return data;
      },
      (data) => {
        toast({ 
          title: "Exchange successful!", 
          description: `Earned ${data.ticketsEarned} tickets from $${data.totalValue.toFixed(2)} worth of items` 
        });
        
        setSelectedItems(new Map());
        fetchInventory();
        fetchUserTickets();
        fetchLeaderboard();
      },
      (error) => {
        console.error("Exchange error:", error);
        toast({ title: "Error exchanging items", description: error.message, variant: "destructive" });
      }
    );
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

      <div className="flex-1 md:ml-64 md:mr-96">
        <TopBar />

        <main className="pt-20 md:pt-16 px-4 md:px-12 py-8">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Enhanced Header with Christmas Effects */}
            <div className="relative flex items-center gap-3 overflow-hidden rounded-xl p-8 bg-gradient-to-r from-blue-500/20 via-white/10 to-blue-500/20 border-2 border-blue-500/30">
              {/* Glowing orbs */}
              <div className="absolute top-0 left-0 w-32 h-32 bg-blue-500/30 rounded-full blur-3xl" />
              <div className="absolute bottom-0 right-0 w-40 h-40 bg-white/20 rounded-full blur-3xl" />
              
              <div className="relative z-10 w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 via-blue-400 to-white/30 flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.6)]">
                <Ticket className="w-8 h-8 text-white drop-shadow-lg" />
              </div>
              <div className="relative z-10 flex-1">
                <h1 className="text-4xl font-bold flex items-center gap-3 mb-2">
                  <Gift className="w-10 h-10 text-blue-400 drop-shadow-glow" />
                  <span className="bg-gradient-to-r from-blue-300 via-white to-blue-300 bg-clip-text text-transparent">
                    Christmas Raffle 2025
                  </span>
                </h1>
                <p className="text-muted-foreground text-lg">Exchange items for tickets - $5 = 1 ticket</p>
              </div>
              {raffleData && (
                <div className="relative z-10 text-right">
                  <div className="flex items-center gap-2 text-blue-400 mb-2">
                    <Clock className="w-6 h-6" />
                    <span className="text-sm font-bold uppercase tracking-wider">Draw In:</span>
                  </div>
                  <div className="text-3xl font-bold bg-gradient-to-r from-blue-300 to-white bg-clip-text text-transparent">
                    {timeLeft}
                  </div>
                </div>
              )}
            </div>

            {/* Enhanced Prize Pool */}
            {raffleData && (
              <Card className="p-8 bg-gradient-to-br from-yellow-500/20 via-orange-500/10 to-yellow-500/20 border-2 border-yellow-500/40 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-yellow-500/20 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-orange-500/20 rounded-full blur-3xl" />
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                      <Trophy className="w-8 h-8 text-yellow-400 drop-shadow-glow" />
                      <span className="bg-gradient-to-r from-yellow-300 via-orange-300 to-yellow-300 bg-clip-text text-transparent">
                        Grand Prize Pool
                      </span>
                    </h2>
                    {raffleData.status === 'completed' && raffleData.winner_id && (
                      <Badge className="bg-green-500 flex items-center gap-2 px-4 py-2 text-sm">
                        <Trophy className="w-5 h-5" />
                        Winner Drawn
                      </Badge>
                    )}
                  </div>
                  <div className="text-center py-6">
                    <p className="text-5xl font-bold bg-gradient-to-r from-yellow-300 via-yellow-100 to-yellow-300 bg-clip-text text-transparent mb-3 drop-shadow-lg">
                      $500.00
                    </p>
                    <p className="text-muted-foreground text-lg mb-4">
                      2 Winners • $250 Each
                    </p>
                    
                    {/* Top Items Grid */}
                    {Array.isArray(raffleData.prize_items) && raffleData.prize_items.length > 0 && (
                      <div className="mt-6">
                        <p className="text-sm text-muted-foreground mb-3">Featured Prize Items</p>
                        <div className="grid grid-cols-4 gap-3">
                          {raffleData.prize_items
                            .sort((a: any, b: any) => Number(b.value) - Number(a.value))
                            .slice(0, 8)
                            .map((item: any, idx: number) => (
                              <div key={idx} className="bg-card/50 backdrop-blur-sm border border-border rounded-lg p-2 hover:scale-105 transition-transform">
                                {item.image_url && (
                                  <img src={item.image_url} alt={item.name} className="w-full aspect-square object-cover rounded mb-1" />
                                )}
                                <p className="text-xs font-medium truncate">{item.name}</p>
                                <p className="text-xs text-primary font-bold">${Number(item.value).toFixed(2)}</p>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
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
                          disabled={isProcessing || ticketsToEarn === 0}
                          className="w-full h-12 text-lg font-bold bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 flex items-center gap-2"
                        >
                          {isProcessing ? (
                            <>Exchanging...</>
                          ) : (
                            <>
                              <Ticket className="w-5 h-5" />
                              Exchange for {ticketsToEarn} Tickets
                            </>
                          )}
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
                              {entry.profiles?.avatar_url && (
                                <img 
                                  src={entry.profiles.avatar_url} 
                                  alt={entry.profiles.username || "User"} 
                                  className="w-10 h-10 rounded-full border-2 border-border"
                                />
                              )}
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
      
      <div className="h-20 md:hidden" />
    </div>
  );
};

export default ChristmasRaffle;