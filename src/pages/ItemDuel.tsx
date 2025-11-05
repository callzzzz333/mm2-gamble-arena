import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { LiveChat } from "@/components/LiveChat";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Swords } from "lucide-react";
import itemDuelImg from "@/assets/item-duel.jpg";

interface DuelItem {
  id: string;
  name: string;
  value: number;
  image_url: string;
  rarity: string;
}

export default function ItemDuel() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [items, setItems] = useState<DuelItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<DuelItem | null>(null);
  const [opponentItem, setOpponentItem] = useState<DuelItem | null>(null);
  const [isDueling, setIsDueling] = useState(false);

  useEffect(() => {
    checkUser();
    fetchItems();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    setUser(user);

    const { data: profile } = await supabase
      .from("profiles")
      .select("balance")
      .eq("id", user.id)
      .single();

    if (profile) {
      setUserBalance(parseFloat(String(profile.balance)));
    }
  };

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from("items")
      .select("*")
      .limit(6);

    if (data) {
      setItems(data);
    }
  };

  const startDuel = async (item: DuelItem) => {
    if (item.value > userBalance) {
      toast.error("Insufficient balance for this item");
      return;
    }

    const { data, error } = await supabase.rpc("update_user_balance", {
      p_user_id: user.id,
      p_amount: -item.value,
      p_type: "bet",
      p_game_type: "item_duel",
      p_description: `Item Duel with ${item.name}`
    });

    if (error || !data) {
      toast.error("Failed to start duel");
      return;
    }

    setUserBalance(prev => prev - item.value);
    setSelectedItem(item);
    setIsDueling(true);

    // Select random opponent item
    const availableItems = items.filter(i => i.id !== item.id);
    const randomOpponent = availableItems[Math.floor(Math.random() * availableItems.length)];
    setOpponentItem(randomOpponent);

    // Resolve duel after animation
    setTimeout(() => resolveDuel(item, randomOpponent), 3000);
  };

  const resolveDuel = async (myItem: DuelItem, oppItem: DuelItem) => {
    // 50/50 chance with slight edge to higher value item
    const myChance = myItem.value / (myItem.value + oppItem.value);
    const won = Math.random() < myChance;

    if (won) {
      const winAmount = (myItem.value + oppItem.value) * 0.95; // 5% house edge
      await supabase.rpc("update_user_balance", {
        p_user_id: user.id,
        p_amount: winAmount,
        p_type: "win",
        p_game_type: "item_duel",
        p_description: "Item Duel win"
      });
      setUserBalance(prev => prev + winAmount);
      toast.success(`Your ${myItem.name} won! +$${winAmount.toFixed(2)}`);
    } else {
      toast.error(`Your ${myItem.name} lost to ${oppItem.name}`);
    }

    setTimeout(() => {
      setIsDueling(false);
      setSelectedItem(null);
      setOpponentItem(null);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      
      <div className="flex-1 ml-64 mr-96">
        <TopBar />
        
        <main className="p-8 pt-24">
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
                  <h2 className="text-xl font-bold text-foreground mb-4">Select Your Item</h2>
                  <div className="grid grid-cols-3 gap-4">
                    {items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => startDuel(item)}
                        className="p-4 bg-card border border-border rounded-lg hover:border-primary transition-all shadow-glow hover:shadow-[0_0_20px_hsl(var(--glow-primary)/0.4)]"
                      >
                        <div className="aspect-square bg-card/50 rounded mb-2 flex items-center justify-center">
                          <Swords className="w-12 h-12 text-primary" />
                        </div>
                        <div className="text-sm font-bold text-foreground">{item.name}</div>
                        <div className="text-xs text-primary">${item.value.toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground mt-1">{item.rarity}</div>
                      </button>
                    ))}
                  </div>
                </Card>

                <Card className="p-4 bg-card/50 border-border">
                  <h3 className="font-bold text-foreground mb-2">How to Play:</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Select an item to duel with</li>
                    <li>• System randomly selects an opponent item</li>
                    <li>• Higher value items have slight advantage</li>
                    <li>• Winner takes both items (minus 5% house edge)</li>
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
                        <Swords className="w-16 h-16 text-primary mx-auto mb-2" />
                        <div className="font-bold text-foreground">{selectedItem?.name}</div>
                        <div className="text-primary">${selectedItem?.value.toFixed(2)}</div>
                      </div>
                    </div>

                    <div className="text-center">
                      <Swords className="w-12 h-12 text-primary animate-pulse mx-auto" />
                      <div className="text-sm text-muted-foreground mt-2">VS</div>
                    </div>

                    <div className="text-center">
                      <div className="p-6 bg-card/50 border-2 border-border rounded-lg shadow-glow">
                        <Swords className="w-16 h-16 text-muted-foreground mx-auto mb-2" />
                        <div className="font-bold text-foreground">{opponentItem?.name}</div>
                        <div className="text-primary">${opponentItem?.value.toFixed(2)}</div>
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
    </div>
  );
}
