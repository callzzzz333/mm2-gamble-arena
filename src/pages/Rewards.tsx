import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gift, Lock, Star, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { getLevelColor, getLevelBgColor } from "@/lib/levelUtils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Crate {
  id: string;
  name: string;
  level_required: number;
  description: string;
  image_url: string | null;
}

interface ClaimedReward {
  id: string;
  crate_id: string;
  claimed_at: string;
  opened: boolean;
  opened_at: string | null;
  received_item_id: string | null;
  items?: {
    name: string;
    image_url: string;
    value: number;
    rarity: string;
  };
}

interface CrateItem {
  item_id: string;
  drop_chance: number;
  items: {
    id: string;
    name: string;
    image_url: string;
    value: number;
    rarity: string;
  };
}

const Rewards = () => {
  const [crates, setCrates] = useState<Crate[]>([]);
  const [userLevel, setUserLevel] = useState(1);
  const [claimedRewards, setClaimedRewards] = useState<ClaimedReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingCrate, setOpeningCrate] = useState<string | null>(null);
  const [wonItem, setWonItem] = useState<any>(null);
  const [showWinDialog, setShowWinDialog] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch user profile for level
      const { data: profile } = await supabase
        .from("profiles")
        .select("level")
        .eq("id", user.id)
        .single();

      if (profile) setUserLevel(profile.level);

      // Fetch all crates
      const { data: cratesData } = await supabase
        .from("crates")
        .select("*")
        .order("level_required", { ascending: true });

      if (cratesData) setCrates(cratesData);

      // Fetch user's claimed rewards
      const { data: claimed } = await supabase
        .from("user_claimed_rewards")
        .select(`
          *,
          items:received_item_id (
            name,
            image_url,
            value,
            rarity
          )
        `)
        .eq("user_id", user.id);

      if (claimed) setClaimedRewards(claimed);
    } catch (error) {
      console.error("Error fetching rewards data:", error);
    } finally {
      setLoading(false);
    }
  };

  const claimCrate = async (crateId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("user_claimed_rewards")
        .insert({
          user_id: user.id,
          crate_id: crateId,
        });

      if (error) {
        if (error.code === "23505") {
          toast.error("You've already claimed this crate!");
        } else {
          toast.error("Failed to claim crate");
        }
        return;
      }

      toast.success("Crate claimed! Open it to reveal your reward!");
      fetchData();
    } catch (error) {
      console.error("Error claiming crate:", error);
      toast.error("An error occurred");
    }
  };

  const openCrate = async (crateId: string, claimedRewardId: string) => {
    setOpeningCrate(crateId);
    
    try {
      // Fetch crate items
      const { data: crateItems } = await supabase
        .from("crate_items")
        .select(`
          item_id,
          drop_chance,
          items (
            id,
            name,
            image_url,
            value,
            rarity
          )
        `)
        .eq("crate_id", crateId);

      if (!crateItems || crateItems.length === 0) {
        toast.error("This crate is empty!");
        setOpeningCrate(null);
        return;
      }

      // Determine random item based on drop chances
      const random = Math.random() * 100;
      let cumulative = 0;
      let selectedItem = crateItems[0].items;

      for (const ci of crateItems as CrateItem[]) {
        cumulative += Number(ci.drop_chance);
        if (random <= cumulative) {
          selectedItem = ci.items;
          break;
        }
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update claimed reward with received item
      const { error: updateError } = await supabase
        .from("user_claimed_rewards")
        .update({
          opened: true,
          opened_at: new Date().toISOString(),
          received_item_id: selectedItem.id,
        })
        .eq("id", claimedRewardId);

      if (updateError) {
        toast.error("Failed to open crate");
        setOpeningCrate(null);
        return;
      }

      // Add item to user's inventory
      const { data: existingItem } = await supabase
        .from("user_items")
        .select("*")
        .eq("user_id", user.id)
        .eq("item_id", selectedItem.id)
        .single();

      if (existingItem) {
        await supabase
          .from("user_items")
          .update({ quantity: existingItem.quantity + 1 })
          .eq("id", existingItem.id);
      } else {
        await supabase
          .from("user_items")
          .insert({
            user_id: user.id,
            item_id: selectedItem.id,
            quantity: 1,
          });
      }

      setWonItem(selectedItem);
      setShowWinDialog(true);
      fetchData();
    } catch (error) {
      console.error("Error opening crate:", error);
      toast.error("An error occurred");
    } finally {
      setOpeningCrate(null);
    }
  };

  const getCrateGradient = (level: number) => {
    if (level === 99) return "from-purple-500/20 via-pink-500/20 to-purple-500/20";
    if (level === 75) return "from-yellow-500/20 via-amber-500/20 to-yellow-500/20";
    if (level === 50) return "from-slate-400/20 via-gray-300/20 to-slate-400/20";
    return "from-orange-700/20 via-orange-600/20 to-orange-700/20";
  };

  const getCrateBorder = (level: number) => {
    if (level === 99) return "border-purple-500/50";
    if (level === 75) return "border-yellow-500/50";
    if (level === 50) return "border-slate-400/50";
    return "border-orange-700/50";
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case "godly": return "text-red-500";
      case "legendary": return "text-purple-500";
      case "rare": return "text-blue-500";
      case "uncommon": return "text-green-500";
      default: return "text-gray-400";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading rewards...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-2">
            <Gift className="h-8 w-8" />
            Level Rewards
          </h1>
          <p className="text-muted-foreground">
            Claim special crates when you reach milestone levels. Current Level:{" "}
            <span className={`font-bold ${getLevelColor(userLevel)}`}>{userLevel}</span>
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {crates.map((crate) => {
            const claimed = claimedRewards.find((r) => r.crate_id === crate.id);
            const isUnlocked = userLevel >= crate.level_required;

            return (
              <Card
                key={crate.id}
                className={`relative overflow-hidden border-2 bg-gradient-to-br ${getCrateGradient(crate.level_required)} ${getCrateBorder(crate.level_required)}`}
              >
                {!isUnlocked && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-10 flex items-center justify-center">
                    <div className="text-center">
                      <Lock className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm font-medium">Unlocks at Level {crate.level_required}</p>
                    </div>
                  </div>
                )}

                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className={getLevelColor(crate.level_required)} />
                    {crate.name}
                  </CardTitle>
                  <CardDescription>{crate.description}</CardDescription>
                </CardHeader>

                <CardContent>
                  <div className="mb-4 text-sm text-muted-foreground">
                    <span className="font-semibold">Required:</span> Level {crate.level_required}
                  </div>

                  {claimed ? (
                    claimed.opened ? (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-green-500 flex items-center gap-1">
                          <Sparkles className="h-4 w-4" />
                          Already Opened
                        </p>
                        {claimed.items && (
                          <div className="flex items-center gap-2 p-2 bg-secondary/50 rounded">
                            <img
                              src={claimed.items.image_url || "/placeholder.svg"}
                              alt={claimed.items.name}
                              className="h-8 w-8 object-contain"
                            />
                            <div className="flex-1">
                              <p className="text-xs font-medium">{claimed.items.name}</p>
                              <p className={`text-xs ${getRarityColor(claimed.items.rarity)}`}>
                                {claimed.items.rarity}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <Button
                        onClick={() => openCrate(crate.id, claimed.id)}
                        disabled={openingCrate === crate.id}
                        className="w-full"
                      >
                        {openingCrate === crate.id ? "Opening..." : "Open Crate"}
                      </Button>
                    )
                  ) : (
                    <Button
                      onClick={() => claimCrate(crate.id)}
                      disabled={!isUnlocked}
                      className="w-full"
                    >
                      Claim Crate
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Dialog open={showWinDialog} onOpenChange={setShowWinDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl flex items-center justify-center gap-2">
              <Sparkles className="h-6 w-6 text-yellow-500" />
              Congratulations!
              <Sparkles className="h-6 w-6 text-yellow-500" />
            </DialogTitle>
            <DialogDescription className="text-center">
              You received:
            </DialogDescription>
          </DialogHeader>
          {wonItem && (
            <div className="flex flex-col items-center gap-4 py-4">
              <img
                src={wonItem.image_url || "/placeholder.svg"}
                alt={wonItem.name}
                className="h-32 w-32 object-contain"
              />
              <div className="text-center">
                <h3 className="text-xl font-bold">{wonItem.name}</h3>
                <p className={`text-sm ${getRarityColor(wonItem.rarity)}`}>
                  {wonItem.rarity}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Value: ${wonItem.value}
                </p>
              </div>
              <Button
                onClick={() => {
                  setShowWinDialog(false);
                  setWonItem(null);
                }}
                className="w-full"
              >
                Awesome!
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Rewards;