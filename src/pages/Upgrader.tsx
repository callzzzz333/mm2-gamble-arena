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
  const [selectedItem, setSelectedItem] = useState<(Item & { quantity: number}) | null>(null);
  const [targetItem, setTargetItem] = useState<Item | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<"won" | "lost" | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    const { data } = await supabase
      .from("items")
      .select("*")
      .order("value", { ascending: true });
    
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

    await new Promise((resolve) => setTimeout(resolve, 3000));
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check user has the item
      const { data: userItem } = await supabase
        .from("user_items")
        .select("*")
        .eq("user_id", user.id)
        .eq("item_id", selectedItem.id)
        .single();

      if (!userItem || userItem.quantity < 1) {
        throw new Error("You don't have this item");
      }

      const chance = calculateSuccessChance();
      const won = Math.random() * 100 < chance;
      setResult(won ? "won" : "lost");

      // Remove input item
      if (userItem.quantity === 1) {
        await supabase
          .from("user_items")
          .delete()
          .eq("id", userItem.id);
      } else {
        await supabase
          .from("user_items")
          .update({ quantity: userItem.quantity - 1 })
          .eq("id", userItem.id);
      }

      // If won, add target item
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
          await supabase
            .from("user_items")
            .insert({
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

      setTimeout(() => {
        toast({
          title: won ? "Upgrade Successful!" : "Upgrade Failed",
          description: won ? `You received ${targetItem.name}!` : `Better luck next time`,
          variant: won ? "default" : "destructive",
        });
        setSelectedItem(null);
        setTargetItem(null);
        setIsSpinning(false);
      }, 1500);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpgrading(false);
      setIsSpinning(false);
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
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="ml-64 mr-96">
        <TopBar />
        <main className="p-8 pt-24">
          <div className="max-w-6xl mx-auto space-y-8">
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center gap-2">
                <TrendingUp className="w-10 h-10" />
                Item Upgrader
              </h1>
              <p className="text-muted-foreground">
                Upgrade your items to higher value items. Higher value = lower success chance.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Input Item */}
              <Card className="p-6 bg-gradient-to-br from-background to-primary/5">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  Input Item
                </h2>
                {selectedItem ? (
                  <div className="space-y-4">
                    <div className={`relative ${isSpinning ? 'animate-pulse' : ''}`}>
                      {selectedItem.image_url && (
                        <img
                          src={selectedItem.image_url}
                          alt={selectedItem.name}
                          className="w-full h-48 object-contain rounded-lg bg-muted/50 p-4"
                        />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-lg">{selectedItem.name}</p>
                      <Badge className={getRarityColor(selectedItem.rarity)}>
                        {selectedItem.rarity}
                      </Badge>
                      <p className="text-primary font-bold mt-2">
                        ${Number(selectedItem.value).toFixed(2)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setInventoryOpen(true)}
                      className="w-full border-primary/50 hover:bg-primary/10"
                    >
                      Change Item
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => setInventoryOpen(true)}
                    className="w-full h-48 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700"
                  >
                    Select Item
                  </Button>
                )}
              </Card>

              {/* Arrow */}
              <div className="flex items-center justify-center">
                <TrendingUp className={`w-12 h-12 text-primary ${isSpinning ? 'animate-pulse' : ''}`} />
              </div>

              {/* Target Item */}
              <Card className="p-6 bg-gradient-to-br from-background to-purple-500/5">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                  Target Item
                </h2>
                {targetItem ? (
                  <div className="space-y-4">
                    <div className={`relative ${isSpinning ? 'animate-bounce' : ''}`}>
                      {targetItem.image_url && (
                        <img
                          src={targetItem.image_url}
                          alt={targetItem.name}
                          className="w-full h-48 object-contain rounded-lg bg-muted/50 p-4"
                        />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-lg">{targetItem.name}</p>
                      <Badge className={getRarityColor(targetItem.rarity)}>
                        {targetItem.rarity}
                      </Badge>
                      <p className="text-purple-500 font-bold mt-2">
                        ${Number(targetItem.value).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="h-48 flex items-center justify-center text-muted-foreground">
                    Select an input item first
                  </div>
                )}
              </Card>
            </div>

            {/* All Available Items Grid */}
            {selectedItem && (
              <Card className="p-6 bg-gradient-to-br from-background to-accent/5">
                <h2 className="text-xl font-bold mb-4">Select Target Item</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-[400px] overflow-y-auto pr-2">
                  {items
                    .filter(i => Number(i.value) > Number(selectedItem.value))
                    .map(item => {
                      const chance = Math.min(95, Math.max(5, (Number(selectedItem.value) / Number(item.value)) * 100));
                      return (
                        <button
                          key={item.id}
                          onClick={() => setTargetItem(item)}
                          className={`p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                            targetItem?.id === item.id
                              ? 'border-primary bg-primary/10 shadow-lg shadow-primary/50'
                              : 'border-border hover:border-primary/50 bg-card'
                          }`}
                        >
                          {item.image_url && (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-full h-20 object-contain mb-2"
                            />
                          )}
                          <p className="text-xs font-semibold truncate">{item.name}</p>
                          <Badge className={`${getRarityColor(item.rarity)} text-xs mt-1`}>
                            {item.rarity}
                          </Badge>
                          <p className="text-primary font-bold text-sm mt-1">
                            ${Number(item.value).toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {chance.toFixed(1)}% chance
                          </p>
                        </button>
                      );
                    })}
                </div>
              </Card>
            )}

            {selectedItem && targetItem && (
              <Card className="p-6 bg-gradient-to-r from-primary/20 via-purple-500/20 to-pink-500/20 border-primary/50 shadow-xl">
                <div className="text-center space-y-4">
                  <div className={isSpinning ? 'animate-pulse' : ''}>
                    <p className="text-sm text-muted-foreground mb-2">Success Chance</p>
                    <p className="text-5xl font-bold bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                      {calculateSuccessChance().toFixed(1)}%
                    </p>
                  </div>
                  <Button
                    onClick={handleUpgrade}
                    disabled={upgrading}
                    size="lg"
                    className="w-full max-w-md mx-auto bg-gradient-to-r from-primary via-purple-600 to-pink-600 hover:from-primary/90 hover:via-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl transition-all"
                  >
                    {upgrading ? (
                      <span className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 animate-spin" />
                        Upgrading...
                      </span>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
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
