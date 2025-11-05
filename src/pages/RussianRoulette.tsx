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
import { Package, Minus } from "lucide-react";
import { UserInventoryDialog } from "@/components/UserInventoryDialog";
import russianRouletteImg from "@/assets/russian-roulette.jpg";

interface Item {
  id: string;
  name: string;
  rarity: string;
  value: number;
  image_url: string | null;
}

interface SelectedItem {
  item: Item;
  quantity: number;
}

export default function RussianRoulette() {
  const navigate = useNavigate();
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [chamber, setChamber] = useState<number>(6);
  const [roundsPlayed, setRoundsPlayed] = useState<number>(0);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [betValue, setBetValue] = useState<number>(0);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    setUser(user);
  };

  const handleSelectItem = (itemWithQty: Item & { quantity: number }) => {
    const existing = selectedItems.find(si => si.item.id === itemWithQty.id);
    if (existing) {
      setSelectedItems(selectedItems.map(si =>
        si.item.id === itemWithQty.id ? { ...si, quantity: si.quantity + 1 } : si
      ));
    } else {
      const { quantity, ...item } = itemWithQty;
      setSelectedItems([...selectedItems, { item, quantity: 1 }]);
    }
    setInventoryOpen(false);
  };

  const removeItem = (itemId: string) => {
    const existing = selectedItems.find(si => si.item.id === itemId);
    if (existing && existing.quantity > 1) {
      setSelectedItems(selectedItems.map(si =>
        si.item.id === itemId ? { ...si, quantity: si.quantity - 1 } : si
      ));
    } else {
      setSelectedItems(selectedItems.filter(si => si.item.id !== itemId));
    }
  };

  const getTotalValue = () => {
    return selectedItems.reduce((sum, si) => sum + (si.item.value * si.quantity), 0);
  };

  const startGame = async () => {
    if (selectedItems.length === 0) {
      toast.error("Please select items to bet");
      return;
    }

    // Remove items from inventory
    for (const si of selectedItems) {
      const { data: userItem } = await supabase
        .from('user_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('item_id', si.item.id)
        .single();

      if (!userItem || userItem.quantity < si.quantity) {
        toast.error(`Not enough ${si.item.name}`);
        return;
      }

      const newQty = userItem.quantity - si.quantity;
      if (newQty === 0) {
        await supabase.from('user_items').delete().eq('id', userItem.id);
      } else {
        await supabase.from('user_items').update({ quantity: newQty }).eq('id', userItem.id);
      }
    }

    setBetValue(getTotalValue());
    setIsPlaying(true);
    setChamber(6);
    setRoundsPlayed(0);
    toast.success("Game started! Pull the trigger...");
  };

  const pullTrigger = async () => {
    const bulletPosition = Math.floor(Math.random() * chamber);
    const newRoundsPlayed = roundsPlayed + 1;
    setRoundsPlayed(newRoundsPlayed);

    if (bulletPosition === 0) {
      // Lost
      setIsPlaying(false);
      toast.error("💥 BANG! You lost!");
      setChamber(6);
      setRoundsPlayed(0);
      setSelectedItems([]);
    } else {
      // Survived
      const multiplier = 1 + (newRoundsPlayed * 0.5);
      const currentWinnings = betValue * multiplier;
      
      toast.success(`✓ Click! You survived! Current multiplier: ${multiplier.toFixed(1)}x ($${currentWinnings.toFixed(2)})`);
      setChamber(chamber - 1);
    }
  };

  const cashOut = async () => {
    const multiplier = 1 + (roundsPlayed * 0.5);

    // Return items with multiplier
    for (const si of selectedItems) {
      const newQty = Math.floor(si.quantity * multiplier);
      
      const { data: existingItem } = await supabase
        .from('user_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('item_id', si.item.id)
        .maybeSingle();

      if (existingItem) {
        await supabase
          .from('user_items')
          .update({ quantity: existingItem.quantity + newQty })
          .eq('id', existingItem.id);
      } else {
        await supabase
          .from('user_items')
          .insert({
            user_id: user.id,
            item_id: si.item.id,
            quantity: newQty
          });
      }
    }

    setIsPlaying(false);
    setChamber(6);
    setRoundsPlayed(0);
    toast.success(`Cashed out! (${multiplier.toFixed(1)}x multiplier)`);
    setSelectedItems([]);
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
      
      <div className="flex-1 ml-64 mr-96">
        <TopBar />
        
        <main className="p-8 pt-24">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="relative h-64 rounded-xl overflow-hidden border border-border shadow-glow">
              <img src={russianRouletteImg} alt="Russian Roulette" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
              <div className="absolute bottom-4 left-4">
                <h1 className="text-4xl font-bold text-foreground">Russian Roulette</h1>
                <p className="text-muted-foreground">Survive to win bigger multipliers!</p>
              </div>
            </div>

            <Card className="p-6 border-border shadow-glow">
              {!isPlaying ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Select Items to Bet</label>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start gap-2"
                      onClick={() => setInventoryOpen(true)}
                    >
                      <Package className="w-4 h-4" />
                      {selectedItems.length === 0 ? 'Select from inventory' : `${selectedItems.length} items selected`}
                    </Button>

                    {selectedItems.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {selectedItems.map((si) => (
                          <div key={si.item.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                            {si.item.image_url && (
                              <img src={si.item.image_url} alt={si.item.name} className="w-12 h-12 object-cover rounded" />
                            )}
                            <div className="flex-1">
                              <p className="font-semibold text-sm">{si.item.name}</p>
                              <div className="flex items-center gap-2">
                                <Badge className={getRarityColor(si.item.rarity)}>{si.item.rarity}</Badge>
                                <span className="text-xs text-muted-foreground">x{si.quantity}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-primary">${(si.item.value * si.quantity).toFixed(2)}</p>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeItem(si.item.id)}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                        <div className="pt-2 border-t border-border">
                          <p className="text-lg font-bold">Total: <span className="text-primary">${getTotalValue().toFixed(2)}</span></p>
                        </div>
                      </div>
                    )}
                  </div>
                  <Button onClick={startGame} className="w-full border border-primary/20 shadow-glow" disabled={selectedItems.length === 0}>
                    Start Game
                  </Button>
                  
                  <div className="mt-6 p-4 bg-card/50 rounded-lg border border-border">
                    <h3 className="font-bold text-foreground mb-2">How to Play:</h3>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Select items from your inventory to bet</li>
                      <li>• Pull the trigger - if you survive, your multiplier increases by 0.5x</li>
                      <li>• Each round, your chances of losing increase</li>
                      <li>• Cash out anytime to secure your winnings</li>
                      <li>• Get hit by the bullet and lose everything!</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <div className="text-6xl font-bold text-primary">
                      {(1 + (roundsPlayed * 0.5)).toFixed(1)}x
                    </div>
                    <p className="text-muted-foreground">Current Multiplier</p>
                    <div className="text-2xl font-bold text-foreground">
                      ${(betValue * (1 + (roundsPlayed * 0.5))).toFixed(2)}
                    </div>
                  </div>

                  <div className="flex justify-center gap-2">
                    {Array.from({ length: chamber }).map((_, i) => (
                      <div key={i} className="w-8 h-8 rounded-full border-2 border-primary bg-card" />
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Button onClick={pullTrigger} variant="destructive" className="border border-destructive/20 shadow-glow">
                      Pull Trigger
                    </Button>
                    <Button onClick={cashOut} className="border border-primary/20 shadow-glow">
                      Cash Out
                    </Button>
                  </div>

                  <div className="text-center text-sm text-muted-foreground">
                    Rounds Survived: {roundsPlayed} | Chambers Left: {chamber}
                  </div>
                </div>
              )}
            </Card>
          </div>
        </main>
      </div>

      <LiveChat />
      <UserInventoryDialog 
        open={inventoryOpen} 
        onOpenChange={setInventoryOpen}
        onSelectItem={handleSelectItem}
      />
    </div>
  );
}
