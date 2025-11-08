import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { LiveChat } from "@/components/LiveChat";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Gift, Snowflake, Star, Users, Clock, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface ChristmasRaffle {
  id: string;
  title: string;
  description: string | null;
  prize_items: any[];
  total_value: number;
  ends_at: string;
  status: string;
  winner_id: string | null;
  entries?: number;
  userEntered?: boolean;
}

const ChristmasRaffle = () => {
  const [raffle, setRaffle] = useState<ChristmasRaffle | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isJoining, setIsJoining] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchRaffle();

    const raffleChannel = supabase
      .channel("christmas-raffle-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "giveaways",
        },
        () => {
          fetchRaffle();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "giveaway_entries",
        },
        () => {
          fetchRaffle();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(raffleChannel);
    };
  }, []);

  useEffect(() => {
    if (!raffle) return;

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(raffle.ends_at).getTime();
      const distance = end - now;

      if (distance < 0) {
        setTimeLeft("Ended");
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      
      setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    }, 1000);

    return () => clearInterval(timer);
  }, [raffle]);

  const fetchRaffle = async () => {
    try {
      const { data: raffleData, error } = await supabase
        .from("giveaways")
        .select("*")
        .eq("type", "christmas")
        .eq("status", "active")
        .gt("ends_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching raffle:", error);
        return;
      }

      if (!raffleData) {
        setRaffle(null);
        return;
      }

      // Get entry count
      const { count } = await supabase
        .from("giveaway_entries")
        .select("*", { count: "exact", head: true })
        .eq("giveaway_id", raffleData.id);

      // Check if user entered
      let userEntered = false;
      if (user) {
        const { data: userEntry } = await supabase
          .from("giveaway_entries")
          .select("*")
          .eq("giveaway_id", raffleData.id)
          .eq("user_id", user.id)
          .maybeSingle();
        userEntered = !!userEntry;
      }

      setRaffle({
        ...raffleData,
        entries: count || 0,
        userEntered,
      } as ChristmasRaffle);
    } catch (error) {
      console.error("Error fetching raffle:", error);
    }
  };

  const handleJoinRaffle = async () => {
    if (!user) {
      toast({ title: "Please login to join", variant: "destructive" });
      return;
    }
    if (!raffle) return;
    if (isJoining) return;

    setIsJoining(true);
    try {
      const { error } = await supabase.functions.invoke("giveaway-join", {
        body: { giveawayId: raffle.id },
      });
      if (error) throw error;
      toast({ title: "🎄 Successfully joined Christmas raffle!" });
      fetchRaffle();
    } catch (error: any) {
      toast({ title: "Error joining raffle", description: error.message, variant: "destructive" });
    } finally {
      setIsJoining(false);
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

  return (
    <div className="min-h-screen w-full flex">
      <Sidebar />

      <div className="flex-1 ml-64 mr-96">
        <TopBar />

        <main className="pt-16 px-12 py-8">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Header with snowflakes */}
            <div className="relative flex items-center gap-3 overflow-hidden rounded-xl p-6 bg-gradient-to-r from-red-500/10 via-green-500/10 to-red-500/10 border border-red-500/20">
              <Snowflake className="w-12 h-12 text-blue-300 absolute top-2 left-4 animate-spin" style={{ animationDuration: "10s" }} />
              <Snowflake className="w-8 h-8 text-blue-200 absolute top-8 right-12 animate-spin" style={{ animationDuration: "15s" }} />
              <Snowflake className="w-6 h-6 text-blue-400 absolute bottom-4 right-24 animate-spin" style={{ animationDuration: "12s" }} />
              
              <div className="relative z-10 w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-green-500 flex items-center justify-center shadow-glow">
                <Gift className="w-7 h-7 text-white" />
              </div>
              <div className="relative z-10">
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  🎄 Christmas Raffle 🎅
                </h1>
                <p className="text-muted-foreground">Win amazing prizes this holiday season!</p>
              </div>
            </div>

            {raffle ? (
              <div className="grid gap-6">
                {/* Main Raffle Card */}
                <Card className="p-8 bg-gradient-to-br from-red-500/5 via-green-500/5 to-red-500/5 border-red-500/20 relative overflow-hidden">
                  {/* Animated decorations */}
                  <Star className="absolute top-4 right-4 w-6 h-6 text-yellow-400 animate-pulse" />
                  <Sparkles className="absolute bottom-4 left-4 w-5 h-5 text-blue-300 animate-pulse" style={{ animationDelay: "0.5s" }} />
                  
                  <div className="space-y-6">
                    {/* Title and Stats */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-2xl font-bold mb-2">{raffle.title}</h2>
                        {raffle.description && (
                          <p className="text-muted-foreground">{raffle.description}</p>
                        )}
                      </div>
                      <Badge className="text-lg px-4 py-2 bg-gradient-to-r from-red-500 to-green-500 font-bold">
                        ${raffle.total_value.toFixed(2)}
                      </Badge>
                    </div>

                    {/* Stats Row */}
                    <div className="flex gap-6">
                      <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent/20 border border-accent/30">
                        <Users className="w-5 h-5 text-accent" />
                        <span className="font-bold text-accent">{raffle.entries} entries</span>
                      </div>
                      <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/20 border border-primary/30">
                        <Clock className="w-5 h-5 text-primary" />
                        <span className="font-bold text-primary">{timeLeft}</span>
                      </div>
                    </div>

                    {/* Prize Items Grid */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <Gift className="w-5 h-5 text-primary" />
                        Prize Items
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {raffle.prize_items.map((item: any, idx: number) => (
                          <Card key={idx} className="p-3 space-y-2 hover:scale-105 transition-transform">
                            <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-card border border-border">
                              {item.image_url && (
                                <img
                                  src={item.image_url}
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm font-medium truncate">{item.name}</p>
                              <div className="flex items-center justify-between">
                                <Badge className={getRarityColor(item.rarity)} variant="outline">
                                  {item.rarity}
                                </Badge>
                                <span className="text-xs font-bold text-primary">${item.value}</span>
                              </div>
                              {item.quantity > 1 && (
                                <Badge variant="secondary" className="text-xs">
                                  x{item.quantity}
                                </Badge>
                              )}
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>

                    {/* Join Button */}
                    <Button
                      onClick={handleJoinRaffle}
                      disabled={raffle.userEntered || isJoining || !user}
                      className="w-full h-14 text-lg font-bold bg-gradient-to-r from-red-500 to-green-500 hover:from-red-600 hover:to-green-600"
                      size="lg"
                    >
                      {!user ? "Login to Join" : isJoining ? "Joining..." : raffle.userEntered ? "✓ Entered!" : "🎄 Join Christmas Raffle"}
                    </Button>
                  </div>
                </Card>

                {/* Info Card */}
                <Card className="p-6 bg-gradient-to-br from-blue-500/5 to-purple-500/5 border-blue-500/20">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-blue-400" />
                    How It Works
                  </h3>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 font-bold">1.</span>
                      <span>Join the raffle for free! No cost to enter.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 font-bold">2.</span>
                      <span>Wait for the countdown to finish.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 font-bold">3.</span>
                      <span>One lucky winner will be randomly selected!</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 font-bold">4.</span>
                      <span>Winner receives ALL prize items directly to their inventory.</span>
                    </li>
                  </ul>
                </Card>
              </div>
            ) : (
              <Card className="p-12 text-center">
                <Snowflake className="w-16 h-16 text-muted-foreground mx-auto mb-4 animate-spin" style={{ animationDuration: "10s" }} />
                <h2 className="text-2xl font-bold mb-2">No Active Christmas Raffle</h2>
                <p className="text-muted-foreground">Check back soon for the next holiday raffle!</p>
              </Card>
            )}
          </div>
        </main>
      </div>

      <LiveChat />
    </div>
  );
};

export default ChristmasRaffle;