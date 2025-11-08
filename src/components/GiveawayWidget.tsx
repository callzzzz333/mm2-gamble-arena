import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useButtonAction } from "@/hooks/useButtonAction";
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
  const { execute: joinGiveaway, isLoading: isJoining } = useButtonAction({
    successMessage: "Successfully joined giveaway!",
    onSuccess: () => fetchGiveaways(),
  });

  useEffect(() => {
    checkUser();
    fetchGiveaways();

    // Call auto-complete function periodically to process expired giveaways
    const autoCompleteInterval = setInterval(async () => {
      try {
        await supabase.functions.invoke("giveaway-auto-complete");
      } catch (err) {
        console.error("Error calling auto-complete:", err);
      }
    }, 30000); // Every 30 seconds

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
          console.log("Giveaway update:", payload);
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
            (async () => {
              try {
                const { data: entries } = await supabase
                  .from("giveaway_entries")
                  .select("user_id, profiles:user_id(avatar_url, username, roblox_username)")
                  .eq("giveaway_id", updated.id);

                if (entries && entries.length > 0) {
                  let spinIndex = 0;
                  const spinInterval = setInterval(() => {
                    setSpinningAvatar(entries[spinIndex % entries.length].profiles);
                    spinIndex++;
                  }, 100);

                  // Stop spinning after 4 seconds and show winner
                  setTimeout(async () => {
                    clearInterval(spinInterval);
                    const { data: winner } = await supabase
                      .from("profiles")
                      .select("avatar_url, username, roblox_username")
                      .eq("id", updated.winner_id)
                      .maybeSingle();

                    if (winner) {
                      setSpinningAvatar(winner);
                      setWinnerAnimation((prev) =>
                        prev?.giveawayId === updated.id ? { ...prev, isSpinning: false } : prev
                      );
                    }
                  }, 4000);

                  // Clear animation after winner reveal
                  setTimeout(() => {
                    setWinnerAnimation(null);
                    setSpinningAvatar(null);
                  }, 8000);
                }
              } catch (err) {
                console.error("Error fetching entries for animation:", err);
              }
            })();
          }

          // Refresh giveaways on any change
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
          console.log("Giveaway entries updated");
          fetchGiveaways();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(giveawaysChannel);
      clearInterval(autoCompleteInterval);
    };
  }, []);

  useEffect(() => {
    if (giveaways.length === 0) return;

    // Reset index if it's out of bounds
    if (currentIndex >= giveaways.length) {
      setCurrentIndex(0);
    }

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
    try {
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

      if (validGiveaways.length === 0) {
        setGiveaways([]);
        return;
      }

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
          try {
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
                .maybeSingle();
              userEntered = !!userEntry;
            }

            return {
              ...giveaway,
              entries: count || 0,
              userEntered,
              profiles: profileMap.get(giveaway.creator_id || ""),
            } as Giveaway;
          } catch (err) {
            console.error(`Error fetching data for giveaway ${giveaway.id}:`, err);
            return {
              ...giveaway,
              entries: 0,
              userEntered: false,
              profiles: profileMap.get(giveaway.creator_id || ""),
            } as Giveaway;
          }
        })
      );

      setGiveaways(giveawaysWithEntries);
    } catch (error) {
      console.error("Fatal error fetching giveaways:", error);
      setGiveaways([]);
    }
  };

  const handleJoinGiveaway = async (giveawayId: string) => {
    if (!user) {
      throw new Error("Please login to join giveaways");
    }

    await joinGiveaway(async () => {
      const { data, error } = await supabase.functions.invoke("giveaway-join", {
        body: { giveawayId },
      });

      if (error) {
        console.error("Error joining giveaway:", error);
        throw error;
      }

      // Check if already entered
      if (data?.alreadyEntered) {
        console.log("Already entered this giveaway");
      }
    });
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
  const isOwnGiveaway = user?.id === currentGiveaway?.creator_id;

  return (
    <Card className="p-2 bg-gradient-to-br from-primary/5 via-accent/5 to-primary/10 border-primary/20 shadow-sm">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Gift className="w-3.5 h-3.5 text-primary" />
          <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-medium">
            {currentIndex + 1}/{giveaways.length}
          </Badge>
          <Badge className="text-[10px] h-4 px-1.5 font-bold bg-gradient-to-r from-primary to-accent">
            ${currentGiveaway.total_value.toFixed(2)}
          </Badge>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span className="font-semibold text-primary">{timeLeft}</span>
        </div>
      </div>

      {isDrawing && winnerAnimation?.isSpinning && (
        <div className="mb-2 p-2 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-md border border-primary/40 animate-pulse">
          <div className="flex items-center gap-2">
            <Avatar className="w-7 h-7 animate-spin border-2 border-primary/50">
              <AvatarImage src={spinningAvatar?.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/30 text-primary font-bold text-xs">
                {(spinningAvatar?.username || spinningAvatar?.roblox_username || "?")[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <p className="text-xs font-bold text-primary">Drawing Winner...</p>
          </div>
        </div>
      )}

      {isDrawing && !winnerAnimation?.isSpinning && spinningAvatar && (
        <div className="mb-2 p-2 bg-gradient-to-r from-green-500/20 via-emerald-500/20 to-green-500/20 rounded-md border border-green-500/50 animate-scale-in">
          <div className="flex items-center gap-2">
            <Avatar className="w-7 h-7 ring-2 ring-green-500">
              <AvatarImage src={spinningAvatar?.avatar_url || undefined} />
              <AvatarFallback className="bg-green-500/30 text-green-500 font-bold text-xs">
                {(spinningAvatar?.username || spinningAvatar?.roblox_username || "?")[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-green-500">🎉 {spinningAvatar?.roblox_username || spinningAvatar?.username}</p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          {/* Host avatar */}
          <Avatar className="w-6 h-6 ring-1 ring-primary/20">
            <AvatarImage src={currentGiveaway.profiles?.avatar_url || undefined} />
            <AvatarFallback className="text-[10px] bg-primary/20 text-primary font-semibold">
              {(currentGiveaway.profiles?.username || currentGiveaway.profiles?.roblox_username || "U")[0].toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          {/* Entries count */}
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-accent/10 border border-accent/20">
            <Users className="w-3 h-3 text-accent" />
            <span className="text-[10px] font-bold text-accent">{currentGiveaway.entries}</span>
          </div>

          {/* Prize items - horizontal scroll */}
          <div className="flex-1 flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {currentGiveaway.prize_items.slice(0, 4).map((item: any, idx: number) => (
              <div
                key={idx}
                className="relative w-8 h-8 flex-shrink-0 rounded border border-primary/20 overflow-hidden bg-card"
              >
                {item.image_url && (
                  <img 
                    src={item.image_url} 
                    alt={item.name} 
                    className="w-full h-full object-cover" 
                  />
                )}
              </div>
            ))}
            {currentGiveaway.prize_items.length > 4 && (
              <span className="text-[9px] text-muted-foreground whitespace-nowrap px-1">
                +{currentGiveaway.prize_items.length - 4}
              </span>
            )}
          </div>
        </div>

        {/* Actions - Always show arrows */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6 hover:bg-primary/10 hover:border-primary/30"
            onClick={() => setCurrentIndex((prev) => (prev === 0 ? giveaways.length - 1 : prev - 1))}
            disabled={giveaways.length <= 1}
          >
            <ChevronLeft className="w-3 h-3" />
          </Button>

          <Button
            onClick={() => handleJoinGiveaway(currentGiveaway.id)}
            disabled={currentGiveaway.userEntered || isJoining || isOwnGiveaway}
            className="flex-1 text-[11px] h-6 font-semibold"
            size="sm"
          >
            {isOwnGiveaway ? "Your Giveaway" : isJoining ? "Joining..." : currentGiveaway.userEntered ? "✓ Entered" : "Join Giveaway"}
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6 hover:bg-primary/10 hover:border-primary/30"
            onClick={() => setCurrentIndex((prev) => (prev === giveaways.length - 1 ? 0 : prev + 1))}
            disabled={giveaways.length <= 1}
          >
            <ChevronRight className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
