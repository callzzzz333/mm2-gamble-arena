import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { LiveChat } from "@/components/LiveChat";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, ArrowRight, Sparkles } from "lucide-react";
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
    
    // Find potential upgrade targets (items worth more)
    const potentialTargets = items.filter(i => Number(i.value) > Number(item.value));
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

      // Calculate success
      const chance = calculateSuccessChance();
      const won = Math.random() * 100 < chance;

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

      // Record game
      await supabase
        .from("upgrader_games")
        .insert({
          user_id: user.id,
          input_item_id: selectedItem.id,
          target_item_id: targetItem.id,
          success_chance: chance,
          won,
          won_item_id: won ? targetItem.id : null,
          completed_at: new Date().toISOString(),
        });

      toast({
        title: won ? "Upgrade Successful!" : "Upgrade Failed",
        description: won 
          ? `You received ${targetItem.name}!`
          : `Better luck next time`,
        variant: won ? "default" : "destructive",
      });

      setSelectedItem(null);
      setTargetItem(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpgrading(false);
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
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">Input Item</h2>
                {selectedItem ? (
                  <div className="space-y-4">
                    {selectedItem.image_url && (
                      <img
                        src={selectedItem.image_url}
                        alt={selectedItem.name}
                        className="w-full h-48 object-contain rounded-lg bg-muted"
                      />
                    )}
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
                      className="w-full"
                    >
                      Change Item
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={() => setInventoryOpen(true)}
                    className="w-full h-48"
                  >
                    Select Item
                  </Button>
                )}
              </Card>

              {/* Arrow */}
              <div className="flex items-center justify-center">
                <ArrowRight className="w-12 h-12 text-primary" />
              </div>

              {/* Target Item */}
              <Card className="p-6">
                <h2 className="text-xl font-bold mb-4">Target Item</h2>
                {targetItem ? (
                  <div className="space-y-4">
                    {targetItem.image_url && (
                      <img
                        src={targetItem.image_url}
                        alt={targetItem.name}
                        className="w-full h-48 object-contain rounded-lg bg-muted"
                      />
                    )}
                    <div>
                      <p className="font-bold text-lg">{targetItem.name}</p>
                      <Badge className={getRarityColor(targetItem.rarity)}>
                        {targetItem.rarity}
                      </Badge>
                      <p className="text-primary font-bold mt-2">
                        ${Number(targetItem.value).toFixed(2)}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Select Target:</p>
                      <div className="flex flex-wrap gap-2">
                        {items
                          .filter(i => selectedItem && Number(i.value) > Number(selectedItem.value))
                          .slice(0, 5)
                          .map(item => (
                            <Button
                              key={item.id}
                              size="sm"
                              variant={targetItem.id === item.id ? "default" : "outline"}
                              onClick={() => setTargetItem(item)}
                            >
                              ${Number(item.value).toFixed(0)}
                            </Button>
                          ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-48 flex items-center justify-center text-muted-foreground">
                    Select an input item first
                  </div>
                )}
              </Card>
            </div>

            {selectedItem && targetItem && (
              <Card className="p-6 bg-gradient-to-r from-primary/10 to-purple-500/10">
                <div className="text-center space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Success Chance</p>
                    <p className="text-4xl font-bold text-primary">
                      {calculateSuccessChance().toFixed(1)}%
                    </p>
                  </div>
                  <Button
                    onClick={handleUpgrade}
                    disabled={upgrading}
                    size="lg"
                    className="w-full max-w-md mx-auto bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-700"
                  >
                    {upgrading ? (
                      "Upgrading..."
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
