import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gift, Lock, Star, Sparkles, Clock } from "lucide-react";
import { toast } from "sonner";
import { getLevelColor, getLevelBgColor } from "@/lib/levelUtils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { LiveChat } from "@/components/LiveChat";

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
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinItems, setSpinItems] = useState<any[]>([]);
  const [nextClaimTimes, setNextClaimTimes] = useState<Record<string, Date>>({});
  const spinnerRef = useRef<HTMLDivElement>(null);

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

      // Fetch user's most recent claimed rewards for each crate
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
        .eq("user_id", user.id)
        .order("claimed_at", { ascending: false });

      if (claimed) {
        setClaimedRewards(claimed);
        
        // Calculate next claim times
        const claimTimes: Record<string, Date> = {};
        claimed.forEach((claim: ClaimedReward) => {
          const claimDate = new Date(claim.claimed_at);
          const nextClaim = new Date(claimDate.getTime() + 24 * 60 * 60 * 1000);
          if (!claimTimes[claim.crate_id] || nextClaim > claimTimes[claim.crate_id]) {
            claimTimes[claim.crate_id] = nextClaim;
          }
        });
        setNextClaimTimes(claimTimes);
      }
    } catch (error) {
      console.error("Error fetching rewards data:", error);
    } finally {
      setLoading(false);
    }
  };

  const canClaimCrate = (crateId: string): boolean => {
    const nextClaimTime = nextClaimTimes[crateId];
    if (!nextClaimTime) return true; // Never claimed
    return new Date() >= nextClaimTime;
  };

  const getTimeUntilNextClaim = (crateId: string): string => {
    const nextClaimTime = nextClaimTimes[crateId];
    if (!nextClaimTime) return "";
    
    const now = new Date();
    const diff = nextClaimTime.getTime() - now.getTime();
    
    if (diff <= 0) return "";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  const claimCrate = async (crateId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (!canClaimCrate(crateId)) {
        toast.error(`Please wait ${getTimeUntilNextClaim(crateId)} before claiming again`);
        return;
      }

      const { error } = await supabase
        .from("user_claimed_rewards")
        .insert({
          user_id: user.id,
          crate_id: crateId,
        });

      if (error) {
        toast.error("Failed to claim crate");
        console.error(error);
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
    setIsSpinning(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch crate items with proper typing
      const { data: crateItems, error: fetchError } = await supabase
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

      if (fetchError || !crateItems || crateItems.length === 0) {
        toast.error("This crate is empty!");
        setOpeningCrate(null);
        setIsSpinning(false);
        return;
      }

      // Determine random item based on drop chances
      const random = Math.random() * 100;
      let cumulative = 0;
      let selectedItem = (crateItems[0] as any).items;

      for (const ci of crateItems as CrateItem[]) {
        cumulative += Number(ci.drop_chance);
        if (random <= cumulative) {
          selectedItem = ci.items;
          break;
        }
      }

      // Create spinning items array with the won item at the end
      const allItems = (crateItems as CrateItem[]).map(ci => ci.items);
      const spinArray = [...allItems, ...allItems, ...allItems, ...allItems, selectedItem];
      setSpinItems(spinArray);

      // Animate the spin
      setTimeout(() => {
        if (spinnerRef.current) {
          const itemWidth = 120; // width + gap
          const finalPosition = -(spinArray.length - 1) * itemWidth + 240;
          spinnerRef.current.style.transform = `translateX(${finalPosition}px)`;
        }
      }, 50);

      // Wait for animation to complete
      await new Promise(resolve => setTimeout(resolve, 4000));

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
        console.error("Update error:", updateError);
        toast.error("Failed to open crate");
        setOpeningCrate(null);
        setIsSpinning(false);
        return;
      }

      // Add item to user's inventory
      const { data: existingItem } = await supabase
        .from("user_items")
        .select("*")
        .eq("user_id", user.id)
        .eq("item_id", selectedItem.id)
        .maybeSingle();

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
      setIsSpinning(false);
      setShowWinDialog(true);
      await fetchData();
    } catch (error) {
      console.error("Error opening crate:", error);
      toast.error("An error occurred while opening the crate");
      setIsSpinning(false);
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
      <Sidebar />
      <TopBar />
      <LiveChat />
      
      <main className="ml-64 mr-96 pt-24 pb-8 px-12">
        <div className="max-w-6xl mx-auto space-y-6">
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
              const recentClaim = claimedRewards.find((r) => r.crate_id === crate.id && !r.opened);
              const lastOpened = claimedRewards.find((r) => r.crate_id === crate.id && r.opened);
              const isUnlocked = userLevel >= crate.level_required;
              const canClaim = canClaimCrate(crate.id);
              const timeUntilClaim = getTimeUntilNextClaim(crate.id);

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

                    {recentClaim ? (
                      <Button
                        onClick={() => openCrate(crate.id, recentClaim.id)}
                        disabled={openingCrate === crate.id}
                        className="w-full"
                      >
                        {openingCrate === crate.id ? "Opening..." : "Open Crate"}
                      </Button>
                    ) : !canClaim ? (
                      <div className="space-y-2">
                        <Button disabled className="w-full">
                          <Clock className="h-4 w-4 mr-2" />
                          Claimed Today
                        </Button>
                        <p className="text-xs text-center text-muted-foreground">
                          Next claim: {timeUntilClaim}
                        </p>
                        {lastOpened?.items && (
                          <div className="flex items-center gap-2 p-2 bg-secondary/50 rounded">
                            <img
                              src={lastOpened.items.image_url || "/placeholder.svg"}
                              alt={lastOpened.items.name}
                              className="h-8 w-8 object-contain"
                            />
                            <div className="flex-1">
                              <p className="text-xs font-medium">Last win:</p>
                              <p className="text-xs">{lastOpened.items.name}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <Button
                        onClick={() => claimCrate(crate.id)}
                        disabled={!isUnlocked}
                        className="w-full"
                      >
                        <Gift className="h-4 w-4 mr-2" />
                        Claim Daily Crate
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </main>

      {/* Spinning Animation Dialog */}
      <Dialog open={isSpinning} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-3xl" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-center text-2xl">Opening Crate...</DialogTitle>
          </DialogHeader>
          <div className="py-8">
            <div className="relative h-32 overflow-hidden">
              {/* Center indicator */}
              <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-primary z-10 transform -translate-x-1/2" />
              <div className="absolute left-1/2 top-0 w-32 h-full border-2 border-primary z-10 transform -translate-x-1/2 rounded-lg pointer-events-none" />
              
              {/* Spinning items */}
              <div
                ref={spinnerRef}
                className="flex gap-4 transition-transform duration-[4000ms] ease-out"
                style={{ transform: 'translateX(240px)' }}
              >
                {spinItems.map((item, index) => (
                  <div
                    key={index}
                    className="flex-shrink-0 w-28 h-28 flex flex-col items-center justify-center bg-secondary/50 rounded-lg p-2 border-2 border-border"
                  >
                    <img
                      src={item.image_url || "/placeholder.svg"}
                      alt={item.name}
                      className="h-16 w-16 object-contain"
                    />
                    <p className="text-xs mt-1 truncate w-full text-center">{item.name}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Win Dialog */}
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
            <div className="flex flex-col items-center gap-4 py-4 animate-scale-in">
              <img
                src={wonItem.image_url || "/placeholder.svg"}
                alt={wonItem.name}
                className="h-32 w-32 object-contain"
              />
              <div className="text-center">
                <h3 className="text-xl font-bold">{wonItem.name}</h3>
                <p className={`text-sm font-semibold ${getRarityColor(wonItem.rarity)}`}>
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