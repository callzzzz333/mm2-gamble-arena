import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { LiveChat } from "@/components/LiveChat";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { UserInventoryDialog } from "@/components/UserInventoryDialog";

interface Item {
  id: string;
  name: string;
  rarity: string;
  value: number;
  image_url: string | null;
}

export default function Upgrader() {
  const [selectedItem, setSelectedItem] = useState<(Item & { quantity: number }) | null>(null);
  const [targetItem, setTargetItem] = useState<Item | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<"won" | "lost" | null>(null);
  const [rotation, setRotation] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    const { data } = await supabase.from("items").select("*").order("value", { ascending: true });
    if (data) setItems(data);
  };

  const handleSelectItem = (item: Item & { quantity: number }) => {
    setSelectedItem(item);
    setInventoryOpen(false);
    const potentialTargets = items.filter((i) => Number(i.value) > Number(item.value));
    if (potentialTargets.length > 0) {
      setTargetItem(potentialTargets[0]);
    }
  };

  const calculateSuccessChance = () => {
    if (!selectedItem || !targetItem) return 0;
    const ratio = Number(selectedItem.value) / Number(targetItem.value);
    return Math.min(95, Math.max(5, ratio * 100));
  };

  const handleUpgrade = async () => {
    if (!selectedItem || !targetItem) return;

    setUpgrading(true);
    setIsSpinning(true);
    setResult(null);

    const chance = calculateSuccessChance();
    
    // Calculate random landing position within the wheel
    const randomDegree = Math.random() * 360;
    
    // Determine if won based on where it lands
    // Success zone is from 0 to successChance% of the circle
    const successZoneDegrees = (chance / 100) * 360;
    const normalizedLanding = randomDegree % 360;
    const won = normalizedLanding <= successZoneDegrees;
    
    // Calculate final rotation with multiple spins + landing position
    const spins = 5;
    const finalRotation = 360 * spins + randomDegree;
    setRotation(finalRotation);

    await new Promise((resolve) => setTimeout(resolve, 3000));

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: userItem } = await supabase
        .from("user_items")
        .select("*")
        .eq("user_id", user.id)
        .eq("item_id", selectedItem.id)
        .single();

      if (!userItem || userItem.quantity < 1) {
        throw new Error("You don't have this item");
      }

      if (userItem.quantity === 1) {
        await supabase.from("user_items").delete().eq("id", userItem.id);
      } else {
        await supabase
          .from("user_items")
          .update({ quantity: userItem.quantity - 1 })
          .eq("id", userItem.id);
      }

      if (won) {
        const { data: existingTarget } = await supabase
          .from("user_items")
          .select("*")
          .eq("user_id", user.id)
          .eq("item_id", targetItem.id)
          .maybeSingle();

        if (existingTarget) {
          await supabase
            .from("user_items")
            .update({ quantity: existingTarget.quantity + 1 })
            .eq("id", existingTarget.id);
        } else {
          await supabase.from("user_items").insert({
            user_id: user.id,
            item_id: targetItem.id,
            quantity: 1,
          });
        }
      }

      await supabase.from("upgrader_games").insert({
        user_id: user.id,
        input_item_id: selectedItem.id,
        target_item_id: targetItem.id,
        success_chance: chance,
        won,
        won_item_id: won ? targetItem.id : null,
        completed_at: new Date().toISOString(),
      });

      await supabase.from("transactions").insert({
        user_id: user.id,
        amount: won ? Number(targetItem.value) : -Number(selectedItem.value),
        type: won ? "win" : "loss",
        game_type: "upgrader",
        description: won ? `Upgraded to ${targetItem.name}` : `Failed to upgrade to ${targetItem.name}`,
      });

      setResult(won ? "won" : "lost");
      setTimeout(() => {
        toast({
          title: won ? "Upgrade Successful!" : "Upgrade Failed",
          description: won ? `You received ${targetItem.name}!` : `Better luck next time`,
          variant: won ? "default" : "destructive",
        });
        setSelectedItem(null);
        setTargetItem(null);
        setIsSpinning(false);
        setRotation(0);
        setResult(null);
      }, 1500);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setIsSpinning(false);
      setRotation(0);
    } finally {
      setUpgrading(false);
    }
  };

  const getRarityColor = (rarity: string) => {
    const colors: any = {
      Godly: "border-red-500 text-red-500",
      Ancient: "border-purple-500 text-purple-500",
      Legendary: "border-orange-500 text-orange-500",
      Rare: "border-blue-500 text-blue-500",
      Uncommon: "border-green-500 text-green-500",
      Common: "border-border text-muted-foreground",
    };
    return colors[rarity] || "border-border text-muted-foreground";
  };

  const successChance = calculateSuccessChance();
  const failChance = 100 - successChance;

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="ml-64 mr-96">
        <TopBar />
        <main className="p-6 pt-20">
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Item Upgrader</h1>
                <p className="text-sm text-muted-foreground">Upgrade items to higher value</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="p-4 bg-card">
                <h2 className="text-sm font-bold mb-3">Input Item</h2>
                {selectedItem ? (
                  <div className="space-y-2">
                    {selectedItem.image_url && (
                      <img
                        src={selectedItem.image_url}
                        alt={selectedItem.name}
                        className="w-full h-24 object-contain rounded bg-secondary/30 p-2"
                      />
                    )}
                    <div>
                      <p className="font-semibold text-sm">{selectedItem.name}</p>
                      <Badge className={`${getRarityColor(selectedItem.rarity)} text-xs`}>{selectedItem.rarity}</Badge>
                      <p className="text-primary font-bold text-sm mt-1">${Number(selectedItem.value).toFixed(2)}</p>
                    </div>
                    <Button onClick={() => setInventoryOpen(true)} variant="outline" size="sm" className="w-full">
                      Change
                    </Button>
                  </div>
                ) : (
                  <Button onClick={() => setInventoryOpen(true)} className="w-full h-24">
                    Select Item
                  </Button>
                )}
              </Card>

              <Card className="p-4 bg-card">
                <h2 className="text-sm font-bold mb-3">Target Item</h2>
                {targetItem ? (
                  <div className="space-y-2">
                    {targetItem.image_url && (
                      <img
                        src={targetItem.image_url}
                        alt={targetItem.name}
                        className="w-full h-24 object-contain rounded bg-secondary/30 p-2"
                      />
                    )}
                    <div>
                      <p className="font-semibold text-sm">{targetItem.name}</p>
                      <Badge className={`${getRarityColor(targetItem.rarity)} text-xs`}>{targetItem.rarity}</Badge>
                      <p className="text-accent font-bold text-sm mt-1">${Number(targetItem.value).toFixed(2)}</p>
                    </div>
                  </div>
                ) : (
                  <div className="h-24 flex items-center justify-center text-sm text-muted-foreground">Select input first</div>
                )}
              </Card>
            </div>

            {selectedItem && (
              <Card className="p-4 bg-card">
                <h2 className="text-sm font-bold mb-2">Select Target</h2>
                <div className="grid grid-cols-6 gap-2 max-h-32 overflow-y-auto">
                  {items
                    .filter((i) => Number(i.value) > Number(selectedItem.value))
                    .map((item) => {
                      const chance = Math.min(95, Math.max(5, (Number(selectedItem.value) / Number(item.value)) * 100));
                      return (
                        <button
                          key={item.id}
                          onClick={() => setTargetItem(item)}
                          className={`p-1 rounded border transition-all hover:scale-105 ${
                            targetItem?.id === item.id ? "border-primary bg-primary/10" : "border-border bg-card"
                          }`}
                        >
                          {item.image_url && <img src={item.image_url} alt={item.name} className="w-full h-10 object-contain" />}
                          <p className="text-[10px] font-semibold truncate">{item.name}</p>
                          <p className="text-[9px] text-muted-foreground">{chance.toFixed(0)}%</p>
                        </button>
                      );
                    })}
                </div>
              </Card>
            )}

            {selectedItem && targetItem && (
              <Card className="p-4 bg-card border-primary/50">
                <div className="space-y-3">
                  {/* Upgrade Wheel */}
                  <div className="relative h-40 flex items-center justify-center overflow-hidden rounded-lg bg-secondary/30">
                    <div
                      className="relative w-36 h-36 rounded-full transition-transform duration-[3000ms] ease-out"
                      style={{
                        transform: `rotate(${rotation}deg)`,
                        background: `conic-gradient(from 0deg, hsl(var(--primary)) 0% ${successChance}%, hsl(var(--destructive)) ${successChance}% 100%)`,
                      }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-20 h-20 rounded-full bg-background border-2 border-border flex items-center justify-center">
                          {!isSpinning && !result && (
                            <div className="text-center">
                              <p className="text-xl font-bold text-primary">{successChance.toFixed(0)}%</p>
                            </div>
                          )}
                          {isSpinning && !result && <Sparkles className="w-8 h-8 text-primary animate-pulse" />}
                          {result && (
                            <p className={`text-lg font-bold ${result === "won" ? "text-primary" : "text-destructive"}`}>
                              {result === "won" ? "WIN" : "LOST"}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[12px] border-t-foreground"></div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-2 bg-primary/20 rounded border border-primary/30">
                      <p className="text-[10px] text-muted-foreground">Success</p>
                      <p className="text-lg font-bold text-primary">{successChance.toFixed(1)}%</p>
                    </div>
                    <div className="p-2 bg-destructive/20 rounded border border-destructive/30">
                      <p className="text-[10px] text-muted-foreground">Fail</p>
                      <p className="text-lg font-bold text-destructive">{failChance.toFixed(1)}%</p>
                    </div>
                  </div>

                  <Button onClick={handleUpgrade} disabled={upgrading} size="lg" className="w-full bg-primary hover:bg-primary/90">
                    {upgrading ? (
                      <span className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 animate-spin" />
                        Upgrading...
                      </span>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Upgrade Item
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </main>
      </div>
      <LiveChat />

      <UserInventoryDialog
        open={inventoryOpen}
        onOpenChange={setInventoryOpen}
        onSelectItem={handleSelectItem}
        multiSelect={false}
        selectedItems={[]}
      />
    </div>
  );
}
