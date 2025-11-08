import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Gift, Users, Clock } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface Giveaway {
  id: string;
  creator_id: string | null;
  title: string;
  description: string | null;
  prize_items: any[];
  total_value: number;
  type: string;
  status: string;
  winner_id: string | null;
  ends_at: string;
  created_at: string;
  entries?: number;
  userEntered?: boolean;
  profiles?: {
    username: string;
    roblox_username: string | null;
    avatar_url: string | null;
  };
}

interface WinnerAnimation {
  giveawayId: string;
  isSpinning: boolean;
  winnerId: string | null;
}

export const GiveawayWidget = () => {
  const [giveaways, setGiveaways] = useState<Giveaway[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [winnerAnimation, setWinnerAnimation] = useState<WinnerAnimation | null>(null);
  const [spinningAvatar, setSpinningAvatar] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkUser();
    fetchGiveaways();

    const giveawaysChannel = supabase
      .channel("giveaways-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "giveaways",
        },
        (payload) => {
          const updated = payload.new as any;
          
          // Start spinning animation when status changes to "drawing"
          if (payload.eventType === "UPDATE" && updated.status === "drawing" && updated.winner_id) {
            console.log("Starting winner animation for giveaway:", updated.id);
            setWinnerAnimation({
              giveawayId: updated.id,
              isSpinning: true,
              winnerId: updated.winner_id,
            });

            // Fetch all entry avatars for spinning effect
            supabase
              .from("giveaway_entries")
              .select("user_id, profiles:user_id(avatar_url, username, roblox_username)")
              .eq("giveaway_id", updated.id)
              .then(({ data: entries }) => {
                if (entries && entries.length > 0) {
                  let spinIndex = 0;
                  const spinInterval = setInterval(() => {
                    setSpinningAvatar(entries[spinIndex % entries.length].profiles);
                    spinIndex++;
                  }, 100);

                  // Stop spinning after 4 seconds and show winner
                  setTimeout(() => {
                    clearInterval(spinInterval);
                    supabase
                      .from("profiles")
                      .select("avatar_url, username, roblox_username")
                      .eq("id", updated.winner_id)
                      .single()
                      .then(({ data: winner }) => {
                        setSpinningAvatar(winner);
                        setWinnerAnimation((prev) =>
                          prev?.giveawayId === updated.id ? { ...prev, isSpinning: false } : prev
                        );
                      });
                  }, 4000);

                  // Clear animation after winner reveal (6 seconds total)
                  setTimeout(() => {
                    setWinnerAnimation(null);
                    setSpinningAvatar(null);
                  }, 8000);
                }
              });
          }

          fetchGiveaways();
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
          fetchGiveaways();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(giveawaysChannel);
    };
  }, []);

  useEffect(() => {
    if (giveaways.length === 0) return;

    const timer = setInterval(() => {
      const current = giveaways[currentIndex];
      if (!current) return;

      const now = new Date().getTime();
      const end = new Date(current.ends_at).getTime();
      const distance = end - now;

      if (distance < 0) {
        setTimeLeft("Ended");
        return;
      }

      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      setTimeLeft(`${minutes}m ${seconds}s`);
    }, 1000);

    return () => clearInterval(timer);
  }, [giveaways, currentIndex]);

  const checkUser = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    setUser(session?.user);
  };

  const fetchGiveaways = async () => {
    const { data: giveawaysData, error: giveawawayError } = await supabase
      .from("giveaways")
      .select("*")
      .eq("status", "active")
      .gt("ends_at", new Date().toISOString())
      .order("created_at", { ascending: false });

    if (giveawawayError) {
      console.error("Error fetching giveaways:", giveawawayError);
      return;
    }

    if (!giveawaysData || giveawaysData.length === 0) {
      setGiveaways([]);
      return;
    }

    // Filter out giveaways with empty prize_items
    const validGiveaways = giveawaysData.filter(
      (g) => g.prize_items && Array.isArray(g.prize_items) && g.prize_items.length > 0
    );

    // Fetch creator profiles
    const creatorIds = validGiveaways.map((g) => g.creator_id).filter(Boolean);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, roblox_username, avatar_url")
      .in("id", creatorIds);

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

    // Fetch entry counts and user entries
    const giveawaysWithEntries = await Promise.all(
      validGiveaways.map(async (giveaway) => {
        const { count } = await supabase
          .from("giveaway_entries")
          .select("*", { count: "exact", head: true })
          .eq("giveaway_id", giveaway.id);

        let userEntered = false;
        if (user) {
          const { data: userEntry } = await supabase
            .from("giveaway_entries")
            .select("*")
            .eq("giveaway_id", giveaway.id)
            .eq("user_id", user.id)
            .single();
          userEntered = !!userEntry;
        }

        return {
          ...giveaway,
          entries: count || 0,
          userEntered,
          profiles: profileMap.get(giveaway.creator_id || ""),
        } as Giveaway;
      })
    );

    setGiveaways(giveawaysWithEntries);
  };

  const joinGiveaway = async (giveawayId: string) => {
    if (!user) {
      toast({ title: "Please login to join giveaways", variant: "destructive" });
      return;
    }

    try {
      const { error } = await supabase.functions.invoke("giveaway-join", {
        body: { giveawayId },
      });

      if (error) throw error;

      toast({ title: "Successfully joined giveaway! 🎉" });
      fetchGiveaways();
    } catch (error: any) {
      toast({ title: error.message || "Failed to join giveaway", variant: "destructive" });
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

  if (giveaways.length === 0) return null;

  const currentGiveaway = giveaways[currentIndex];
  const isDrawing = winnerAnimation?.giveawayId === currentGiveaway?.id;

  return (
    <Card className="p-3 bg-gradient-to-br from-primary/5 via-accent/5 to-primary/10 border-primary/20 shadow-elegant hover:shadow-glow transition-all duration-300">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20">
            <Gift className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-bold text-sm bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Active Giveaway
          </h3>
        </div>
        <Badge variant="secondary" className="text-xs h-5 px-2">
          {currentIndex + 1} / {giveaways.length}
        </Badge>
      </div>

      {isDrawing && winnerAnimation?.isSpinning && (
        <div className="mb-3 p-3 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-lg border border-primary/40 animate-pulse backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="w-10 h-10 animate-spin border-2 border-primary/50">
                <AvatarImage src={spinningAvatar?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/30 text-primary font-bold text-sm">
                  {(spinningAvatar?.username || spinningAvatar?.roblox_username || "?")[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            </div>
            <div>
              <p className="text-sm font-bold text-primary">Drawing Winner...</p>
              <p className="text-xs text-muted-foreground">Good luck!</p>
            </div>
          </div>
        </div>
      )}

      {isDrawing && !winnerAnimation?.isSpinning && spinningAvatar && (
        <div className="mb-3 p-3 bg-gradient-to-r from-green-500/20 via-emerald-500/20 to-green-500/20 rounded-lg border-2 border-green-500/50 animate-scale-in backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="w-10 h-10 ring-2 ring-green-500 shadow-lg shadow-green-500/30">
                <AvatarImage src={spinningAvatar?.avatar_url || undefined} />
                <AvatarFallback className="bg-green-500/30 text-green-500 font-bold text-sm">
                  {(spinningAvatar?.username || spinningAvatar?.roblox_username || "?")[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -top-1 -right-1 text-xl animate-bounce">🎉</div>
            </div>
            <div>
              <p className="text-sm font-bold text-green-500">Winner!</p>
              <p className="text-xs font-medium text-foreground">{spinningAvatar?.roblox_username || spinningAvatar?.username}</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-start gap-3">
          {/* Left side: Host and info */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <Avatar className="w-7 h-7 ring-2 ring-primary/20">
                <AvatarImage src={currentGiveaway.profiles?.avatar_url || undefined} />
                <AvatarFallback className="text-xs bg-primary/20 text-primary font-semibold">
                  {(currentGiveaway.profiles?.username || currentGiveaway.profiles?.roblox_username || "U")[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">
                  {currentGiveaway.profiles?.roblox_username || currentGiveaway.profiles?.username || "Host"}
                </p>
                <p className="text-[10px] text-muted-foreground">Host</p>
              </div>
            </div>
            
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 p-1.5 rounded-lg bg-primary/5 border border-primary/10">
                <Clock className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Ends In</p>
                  <p className="text-xs font-bold text-primary truncate">{timeLeft}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-1.5 rounded-lg bg-accent/5 border border-accent/10">
                <Users className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Entries</p>
                  <p className="text-xs font-bold text-accent">{currentGiveaway.entries}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right side: Prize items grid */}
          <div className="flex-shrink-0">
            <div className="grid grid-cols-2 gap-1.5 p-1.5 rounded-lg bg-gradient-to-br from-primary/5 to-accent/5 border border-border/50">
              {currentGiveaway.prize_items.slice(0, 4).map((item: any, idx: number) => (
                <div
                  key={idx}
                  className="relative w-12 h-12 rounded-md border border-primary/20 overflow-hidden bg-card shadow-sm hover:shadow-md hover:border-primary/40 hover:scale-105 transition-all duration-200 group"
                >
                  {item.image_url && (
                    <>
                      <img 
                        src={item.image_url} 
                        alt={item.name} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200" 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    </>
                  )}
                </div>
              ))}
            </div>
            {currentGiveaway.prize_items.length > 4 && (
              <p className="text-[9px] text-center text-muted-foreground mt-1 font-medium">
                +{currentGiveaway.prize_items.length - 4} more
              </p>
            )}
          </div>
        </div>

        {/* Actions - Always show arrows */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 hover:bg-primary/10 hover:border-primary/30 transition-all"
            onClick={() => setCurrentIndex((prev) => (prev === 0 ? giveaways.length - 1 : prev - 1))}
            disabled={giveaways.length <= 1}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>

          <Button
            onClick={() => joinGiveaway(currentGiveaway.id)}
            disabled={currentGiveaway.userEntered}
            className="flex-1 text-xs h-7 font-semibold shadow-sm hover:shadow-md transition-all"
            size="sm"
          >
            {currentGiveaway.userEntered ? "✓ Entered" : "Join Giveaway"}
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 hover:bg-primary/10 hover:border-primary/30 transition-all"
            onClick={() => setCurrentIndex((prev) => (prev === giveaways.length - 1 ? 0 : prev + 1))}
            disabled={giveaways.length <= 1}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
