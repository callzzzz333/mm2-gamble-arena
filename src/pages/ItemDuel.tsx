import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { LiveChat } from "@/components/LiveChat";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Swords, Package } from "lucide-react";
import { UserInventoryDialog } from "@/components/UserInventoryDialog";
import itemDuelImg from "@/assets/item-duel.jpg";

interface Item {
  id: string;
  name: string;
  value: number;
  image_url: string | null;
  rarity: string;
}

export default function ItemDuel() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [opponentItem, setOpponentItem] = useState<Item | null>(null);
  const [isDueling, setIsDueling] = useState(false);
  const [availableItems, setAvailableItems] = useState<Item[]>([]);

  useEffect(() => {
    checkUser();
    fetchAvailableItems();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      navigate("/auth");
      return;
    }
    setUser(user);
  };

  const fetchAvailableItems = async () => {
    const { data } = await supabase
      .from("items")
      .select("*")
      .limit(10);

    if (data) {
      setAvailableItems(data);
    }
  };

  const handleSelectItem = async (itemWithQty: Item & { quantity: number }) => {
    const { quantity, ...item } = itemWithQty;
    
    // Remove 1 of this item from inventory
    const { data: userItem } = await supabase
      .from('user_items')
      .select('*')
      .eq('user_id', user.id)
      .eq('item_id', item.id)
      .single();

    if (!userItem) {
      toast.error("Item not found in inventory");
      return;
    }

    const newQty = userItem.quantity - 1;
    if (newQty === 0) {
      await supabase.from('user_items').delete().eq('id', userItem.id);
    } else {
      await supabase.from('user_items').update({ quantity: newQty }).eq('id', userItem.id);
    }

    setInventoryOpen(false);
    setSelectedItem(item);
    setIsDueling(true);

    // Select random opponent item
    const randomOpponent = availableItems[Math.floor(Math.random() * availableItems.length)];
    setOpponentItem(randomOpponent);

    // Resolve duel after animation
    setTimeout(() => resolveDuel(item, randomOpponent), 3000);
  };

  const resolveDuel = async (myItem: Item, oppItem: Item) => {
    // 50/50 chance with slight edge to higher value item
    const myChance = myItem.value / (myItem.value + oppItem.value);
    const won = Math.random() < myChance;

    if (won) {
      // Give back the player's item + opponent's item (95% of opponent's)
      const { data: existingMyItem } = await supabase
        .from('user_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('item_id', myItem.id)
        .maybeSingle();

      if (existingMyItem) {
        await supabase
          .from('user_items')
          .update({ quantity: existingMyItem.quantity + 1 })
          .eq('id', existingMyItem.id);
      } else {
        await supabase
          .from('user_items')
          .insert({
            user_id: user.id,
            item_id: myItem.id,
            quantity: 1
          });
      }

      // Add opponent item (95% chance to get it - house edge)
      if (Math.random() < 0.95) {
        const { data: existingOppItem } = await supabase
          .from('user_items')
          .select('*')
          .eq('user_id', user.id)
          .eq('item_id', oppItem.id)
          .maybeSingle();

        if (existingOppItem) {
          await supabase
            .from('user_items')
            .update({ quantity: existingOppItem.quantity + 1 })
            .eq('id', existingOppItem.id);
        } else {
          await supabase
            .from('user_items')
            .insert({
              user_id: user.id,
              item_id: oppItem.id,
              quantity: 1
            });
        }
      }

      toast.success(`Your ${myItem.name} won! You got ${oppItem.name}!`);
    } else {
      toast.error(`Your ${myItem.name} lost to ${oppItem.name}`);
    }

    setTimeout(() => {
      setIsDueling(false);
      setSelectedItem(null);
      setOpponentItem(null);
    }, 2000);
  };

  const getRarityColor = (rarity: string) => {
    const colors: any = {
      'Godly': 'bg-red-500/20 text-red-500',
      'Ancient': 'bg-purple-500/20 text-purple-500',
      'Legendary': 'bg-orange-500/20 text-orange-500',
      'Rare': 'bg-blue-500/20 text-blue-500',
      'Uncommon': 'bg-green-500/20 text-green-500',
      'Common': 'bg-gray-500/20 text-gray-500'
    };
    return colors[rarity] || 'bg-gray-500/20 text-gray-500';
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      
      <div className="flex-1 md:ml-64 md:mr-96">
        <TopBar />
        
        <main className="p-4 md:p-8 pt-20 md:pt-24">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="relative h-64 rounded-xl overflow-hidden border border-border shadow-glow">
              <img src={itemDuelImg} alt="Item Duel" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
              <div className="absolute bottom-4 left-4">
                <h1 className="text-4xl font-bold text-foreground">Item Duel</h1>
                <p className="text-muted-foreground">Battle items head-to-head!</p>
              </div>
            </div>

            {!isDueling ? (
              <div className="space-y-6">
                <Card className="p-6 border-border shadow-glow">
                  <h2 className="text-xl font-bold text-foreground mb-4">Select Item from Your Inventory</h2>
                  <Button
                    onClick={() => setInventoryOpen(true)}
                    className="w-full justify-start gap-2 h-16"
                    variant="outline"
                  >
                    <Package className="w-5 h-5" />
                    <span>Choose item to duel with</span>
                  </Button>
                </Card>

                <Card className="p-4 bg-card/50 border-border">
                  <h3 className="font-bold text-foreground mb-2">How to Play:</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Select an item from your inventory to duel with</li>
                    <li>• System randomly selects an opponent item</li>
                    <li>• Higher value items have slight advantage</li>
                    <li>• Winner gets both items (95% chance - 5% house edge)</li>
                    <li>• Quick and intense battles!</li>
                  </ul>
                </Card>
              </div>
            ) : (
              <Card className="p-8 border-border shadow-glow">
                <div className="space-y-8">
                  <h2 className="text-3xl font-bold text-center text-foreground">DUEL IN PROGRESS</h2>
                  
                  <div className="grid grid-cols-3 gap-4 items-center">
                    <div className="text-center">
                      <div className="p-6 bg-primary/10 border-2 border-primary rounded-lg shadow-glow">
                        {selectedItem?.image_url ? (
                          <img src={selectedItem.image_url} alt={selectedItem.name} className="w-24 h-24 mx-auto mb-2 object-cover rounded" />
                        ) : (
                          <Swords className="w-16 h-16 text-primary mx-auto mb-2" />
                        )}
                        <div className="font-bold text-foreground">{selectedItem?.name}</div>
                        <div className="text-primary">${selectedItem?.value.toFixed(2)}</div>
                        {selectedItem && <Badge className={getRarityColor(selectedItem.rarity)}>{selectedItem.rarity}</Badge>}
                      </div>
                    </div>

                    <div className="text-center">
                      <Swords className="w-12 h-12 text-primary animate-pulse mx-auto" />
                      <div className="text-sm text-muted-foreground mt-2">VS</div>
                    </div>

                    <div className="text-center">
                      <div className="p-6 bg-card/50 border-2 border-border rounded-lg shadow-glow">
                        {opponentItem?.image_url ? (
                          <img src={opponentItem.image_url} alt={opponentItem.name} className="w-24 h-24 mx-auto mb-2 object-cover rounded" />
                        ) : (
                          <Swords className="w-16 h-16 text-muted-foreground mx-auto mb-2" />
                        )}
                        <div className="font-bold text-foreground">{opponentItem?.name}</div>
                        <div className="text-primary">${opponentItem?.value.toFixed(2)}</div>
                        {opponentItem && <Badge className={getRarityColor(opponentItem.rarity)}>{opponentItem.rarity}</Badge>}
                      </div>
                    </div>
                  </div>

                  <div className="text-center text-muted-foreground">
                    Determining winner...
                  </div>
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
      />
      
      <div className="h-20 md:hidden" />
    </div>
  );
}
