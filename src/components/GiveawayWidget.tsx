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
}

export const GiveawayWidget = () => {
  const [giveaways, setGiveaways] = useState<Giveaway[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<string>("");
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
        () => {
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
    const { data: giveawaysData, error: giveawaysError } = await supabase
      .from("giveaways")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (giveawaysError) {
      console.error("Error fetching giveaways:", giveawaysError);
      return;
    }

    if (!giveawaysData || giveawaysData.length === 0) {
      setGiveaways([]);
      return;
    }

    // Fetch entry counts and user entries
    const giveawaysWithEntries = await Promise.all(
      giveawaysData.map(async (giveaway) => {
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

  return (
    <Card className="p-3 bg-gradient-to-br from-accent/10 to-primary/10 border-primary/30 shadow-glow">
      <div className="flex items-center gap-2 mb-2">
        <Gift className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm">Active Giveaway</h3>
        {giveaways.length > 1 && (
          <Badge variant="secondary" className="ml-auto">
            {currentIndex + 1} / {giveaways.length}
          </Badge>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <h4 className="font-medium text-sm text-foreground">{currentGiveaway.title}</h4>
            {currentGiveaway.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{currentGiveaway.description}</p>
            )}
          </div>
          {currentGiveaway.type === "auto" && (
            <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30 text-[10px] px-1.5 py-0">
              AUTO
            </Badge>
          )}
        </div>

        {/* Prize Items */}
        <div className="grid grid-cols-3 gap-1.5">
          {currentGiveaway.prize_items.map((item: any, idx: number) => (
            <div
              key={idx}
              className="relative rounded border border-border/50 overflow-hidden bg-card/50 backdrop-blur-sm"
            >
              {item.image_url && (
                <img src={item.image_url} alt={item.name} className="w-full h-14 object-cover" />
              )}
              <div className="p-1.5 space-y-0.5">
                <p className="text-[10px] font-semibold truncate">{item.name}</p>
                <Badge className={`${getRarityColor(item.rarity)} text-[8px] px-1 py-0`}>
                  {item.rarity}
                </Badge>
                <p className="text-[10px] text-primary font-bold">${item.value.toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3 text-muted-foreground" />
            <span className="font-semibold">{currentGiveaway.entries}</span>
            <span className="text-muted-foreground">entries</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-muted-foreground" />
            <span className="font-semibold text-primary">{timeLeft}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          <Button
            onClick={() => joinGiveaway(currentGiveaway.id)}
            disabled={currentGiveaway.userEntered}
            className="flex-1 text-xs h-7"
            size="sm"
          >
            {currentGiveaway.userEntered ? "Entered ✓" : "Join Giveaway"}
          </Button>

          {giveaways.length > 1 && (
            <>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => setCurrentIndex((prev) => (prev === 0 ? giveaways.length - 1 : prev - 1))}
              >
                <ChevronLeft className="w-3 h-3" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => setCurrentIndex((prev) => (prev === giveaways.length - 1 ? 0 : prev + 1))}
              >
                <ChevronRight className="w-3 h-3" />
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
};
