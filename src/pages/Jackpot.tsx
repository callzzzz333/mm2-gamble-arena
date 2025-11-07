import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { LiveChat } from "@/components/LiveChat";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Trophy, Package, Minus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { UserInventoryDialog } from "@/components/UserInventoryDialog";

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

interface JackpotEntry {
  id: string;
  user_id: string;
  bet_amount: string;
  win_chance: string;
  items: any[];
  profiles: any;
}

interface JackpotGame {
  id: string;
  total_pot: string;
  status: string;
  draw_at: string | null;
}

const Jackpot = () => {
  const [currentGame, setCurrentGame] = useState<JackpotGame | null>(null);
  const [entries, setEntries] = useState<JackpotEntry[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [user, setUser] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkUser();
    fetchCurrentGame();

    const interval = setInterval(() => {
      if (currentGame?.draw_at) {
        const remaining = Math.max(0, new Date(currentGame.draw_at).getTime() - Date.now());
        setTimeLeft(Math.floor(remaining / 1000));
        
        if (remaining <= 0 && currentGame.status === 'active') {
          drawWinner();
        }
      }
    }, 1000);

    const channel = supabase
      .channel('jackpot-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jackpot_games' }, () => {
        fetchCurrentGame();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jackpot_entries' }, () => {
        fetchCurrentGame();
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [currentGame]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      navigate("/auth");
      return;
    }
    setUser(user);
  };

  const fetchCurrentGame = async () => {
    const { data: game } = await supabase
      .from("jackpot_games")
      .select("*")
      .in("status", ["active", "rolling"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!game) {
      // Create new game
      const drawTime = new Date(Date.now() + 120000); // 2 minutes
      const { data: newGame } = await supabase
        .from("jackpot_games")
        .insert({
          status: 'active',
          draw_at: drawTime.toISOString()
        })
        .select()
        .single();
      
      setCurrentGame(newGame as any);
      setEntries([]);
    } else {
      setCurrentGame(game as any);
      
      const { data: gameEntries } = await supabase
        .from("jackpot_entries")
        .select(`
          *,
          profiles!jackpot_entries_user_id_fkey(username)
        `)
        .eq("game_id", game.id);
      
      setEntries(gameEntries as any || []);
    }
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

  const enterJackpot = async () => {
    if (!user || !currentGame) return;

    if (selectedItems.length === 0) {
      toast({ title: "Please select items to bet", variant: "destructive" });
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
        toast({ title: `Not enough ${si.item.name}`, variant: "destructive" });
        return;
      }

      const newQty = userItem.quantity - si.quantity;
      if (newQty === 0) {
        await supabase.from('user_items').delete().eq('id', userItem.id);
      } else {
        await supabase.from('user_items').update({ quantity: newQty }).eq('id', userItem.id);
      }
    }

    const amount = getTotalValue();
    const itemsData = selectedItems.map(si => ({
      item_id: si.item.id,
      name: si.item.name,
      value: si.item.value,
      quantity: si.quantity,
      image_url: si.item.image_url,
      rarity: si.item.rarity
    }));

    // Insert entry
    const { error: entryError } = await supabase
      .from("jackpot_entries")
      .insert({
        game_id: currentGame.id,
        user_id: user.id,
        bet_amount: amount,
        win_chance: 0,
        items: itemsData
      });

    if (entryError) {
      toast({ title: "Error entering jackpot", description: entryError.message, variant: "destructive" });
      return;
    }

    // Record bet transaction
    await supabase.from("transactions").insert({
      user_id: user.id,
      amount: -amount,
      type: 'bet',
      game_type: 'jackpot',
      game_id: currentGame.id,
      description: `Entered jackpot with $${amount.toFixed(2)}`
    });

    // Update game total
    await supabase
      .from("jackpot_games")
      .update({ total_pot: parseFloat(currentGame.total_pot) + amount })
      .eq("id", currentGame.id);

    setSelectedItems([]);
    toast({ title: "Entered jackpot!", description: `Bet $${amount.toFixed(2)}` });
  };

  const drawWinner = async () => {
    if (!currentGame || entries.length === 0) return;

    // Calculate win chances
    const totalPot = parseFloat(currentGame.total_pot);
    const updatedEntries = entries.map(entry => ({
      ...entry,
      win_chance: (parseFloat(entry.bet_amount) / totalPot) * 100
    }));

    // Pick winner based on weighted probability
    const random = Math.random() * 100;
    let cumulative = 0;
    let winnerId = entries[0].user_id;

    for (const entry of updatedEntries) {
      cumulative += entry.win_chance;
      if (random <= cumulative) {
        winnerId = entry.user_id;
        break;
      }
    }

    // Update game status
    await supabase
      .from("jackpot_games")
      .update({
        winner_id: winnerId,
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq("id", currentGame.id);

    // Record winner transaction
    const winnerAmount = totalPot * 0.95;
    await supabase.from("transactions").insert({
      user_id: winnerId,
      amount: winnerAmount,
      type: 'win',
      game_type: 'jackpot',
      game_id: currentGame.id,
      description: `Won jackpot with ${updatedEntries.find(e => e.user_id === winnerId)?.win_chance.toFixed(2)}% chance`
    });

    // Record loss transactions for all non-winners
    for (const entry of entries) {
      if (entry.user_id !== winnerId) {
        await supabase.from("transactions").insert({
          user_id: entry.user_id,
          amount: 0,
          type: 'loss',
          game_type: 'jackpot',
          game_id: currentGame.id,
          description: `Lost jackpot`
        });
      }
    }

    // Collect all items from all entries
    const allItems: any[] = [];
    for (const entry of entries) {
      if (entry.items && Array.isArray(entry.items)) {
        allItems.push(...entry.items);
      }
    }

    // Give winner 95% of all items (5% house edge)
    for (const item of allItems) {
      const adjustedQty = Math.floor(item.quantity * 0.95);
      if (adjustedQty > 0) {
        const { data: existingItem } = await supabase
          .from('user_items')
          .select('*')
          .eq('user_id', winnerId)
          .eq('item_id', item.item_id)
          .maybeSingle();

        if (existingItem) {
          await supabase
            .from('user_items')
            .update({ quantity: existingItem.quantity + adjustedQty })
            .eq('id', existingItem.id);
        } else {
          await supabase
            .from('user_items')
            .insert({
              user_id: winnerId,
              item_id: item.item_id,
              quantity: adjustedQty
            });
        }
      }
    }

    if (winnerId === user?.id) {
      toast({ title: "YOU WON THE JACKPOT! 🎉", description: `Won $${(totalPot * 0.95).toFixed(2)} in items!` });
    }

    fetchCurrentGame();
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
    <div className="min-h-screen w-full flex">
      <Sidebar />
      
      <div className="flex-1 ml-64 mr-96">
        <TopBar />
        
        <main className="pt-16 px-12 py-8">
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow">
                <Trophy className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Jackpot</h1>
                <p className="text-muted-foreground">Win the entire pot based on your bet amount</p>
              </div>
            </div>

            {/* Jackpot Pot */}
            <Card className="p-8 text-center">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Current Pot</p>
                  <p className="text-5xl font-bold">${parseFloat(currentGame?.total_pot || "0").toFixed(2)}</p>
                </div>
                
                {currentGame?.status === 'active' && timeLeft > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Draw in: {timeLeft}s</p>
                    <Progress value={(120 - timeLeft) / 120 * 100} className="h-2" />
                  </div>
                )}

                {currentGame?.status === 'rolling' && (
                  <p className="text-xl font-semibold animate-pulse">Drawing winner...</p>
                )}
              </div>
            </Card>

            {/* Enter Jackpot */}
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Enter Jackpot</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Select Items to Bet</label>
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

                <Button onClick={enterJackpot} className="w-full" size="lg" disabled={selectedItems.length === 0}>
                  Enter Jackpot
                </Button>
              </div>
            </Card>

            {/* Participants */}
            <div>
              <h2 className="text-xl font-bold mb-4">Participants ({entries.length})</h2>
              {entries.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">No participants yet. Be the first!</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {entries.map((entry) => {
                    const chance = currentGame ? (parseFloat(entry.bet_amount) / parseFloat(currentGame.total_pot)) * 100 : 0;
                    return (
                      <Card key={entry.id} className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{entry.profiles?.username || 'Unknown'}</span>
                          <span className="text-lg font-bold">${parseFloat(entry.bet_amount).toFixed(2)}</span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm text-muted-foreground">
                            <span>Win Chance</span>
                            <span>{chance.toFixed(2)}%</span>
                          </div>
                          <Progress value={chance} className="h-2" />
                          
                          {entry.items && entry.items.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-border">
                              <p className="text-xs text-muted-foreground mb-2">Items bet:</p>
                              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                                {entry.items.map((item: any, idx: number) => (
                                  <div key={idx} className="p-1 bg-muted/30 rounded text-center">
                                    {item.image_url && (
                                      <img src={item.image_url} alt={item.name} className="w-full aspect-square object-cover rounded mb-1" />
                                    )}
                                    <p className="text-xs truncate">{item.name}</p>
                                    <p className="text-xs text-muted-foreground">x{item.quantity}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
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
};

export default Jackpot;
