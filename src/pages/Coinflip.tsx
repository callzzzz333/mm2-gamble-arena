import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { LiveChat } from "@/components/LiveChat";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Coins, Package, Plus, Minus } from "lucide-react";
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

interface CoinflipGame {
  id: string;
  creator_id: string;
  joiner_id: string | null;
  bet_amount: string;
  creator_side: string;
  winner_id: string | null;
  result: string | null;
  status: string;
  created_at: string;
  creator_items: any[];
  joiner_items: any[];
  profiles: any;
}

const Coinflip = () => {
  const [games, setGames] = useState<CoinflipGame[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [selectedSide, setSelectedSide] = useState<'heads' | 'tails'>('heads');
  const [user, setUser] = useState<any>(null);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkUser();
    fetchGames();
    
    const gamesChannel = supabase
      .channel('coinflip-games-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coinflip_games' }, () => {
        fetchGames();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(gamesChannel);
    };
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

  const fetchGames = async () => {
    const { data, error } = await supabase
      .from("coinflip_games")
      .select("*")
      .eq("status", "waiting")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching games:", error);
      return;
    }

    // Fetch creator profiles separately
    if (data && data.length > 0) {
      const creatorIds = data.map(game => game.creator_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", creatorIds);

      const gamesWithProfiles = data.map(game => ({
        ...game,
        profiles: profiles?.find(p => p.id === game.creator_id)
      }));

      setGames(gamesWithProfiles as any || []);
    } else {
      setGames(data as any || []);
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

  const createGame = async () => {
    if (!user) {
      toast({ title: "Please login first", variant: "destructive" });
      return;
    }

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

      if (!userItem) {
        toast({ title: "Item not found in inventory", variant: "destructive" });
        return;
      }

      if (userItem.quantity < si.quantity) {
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

    const itemsData = selectedItems.map(si => ({
      item_id: si.item.id,
      name: si.item.name,
      value: si.item.value,
      quantity: si.quantity,
      image_url: si.item.image_url,
      rarity: si.item.rarity
    }));

    const { error } = await supabase.from("coinflip_games").insert({
      creator_id: user.id,
      bet_amount: getTotalValue(),
      creator_side: selectedSide,
      creator_items: itemsData,
      status: 'waiting'
    });

    if (error) {
      toast({ title: "Error creating game", description: error.message, variant: "destructive" });
      return;
    }

    setSelectedItems([]);
    toast({ title: "Game created!", description: "Waiting for opponent..." });
  };

  const joinGame = async (game: CoinflipGame) => {
    if (!user) {
      toast({ title: "Please login first", variant: "destructive" });
      return;
    }

    if (game.creator_id === user.id) {
      toast({ title: "Cannot join your own game", variant: "destructive" });
      return;
    }

    if (selectedItems.length === 0) {
      toast({ title: "Please select items to bet", variant: "destructive" });
      return;
    }

    const joinerTotal = getTotalValue();
    const creatorTotal = parseFloat(game.bet_amount);
    const tolerance = creatorTotal * 0.1;

    if (joinerTotal < creatorTotal - tolerance || joinerTotal > creatorTotal + tolerance) {
      toast({ 
        title: "Invalid bet amount", 
        description: `Must be within 10% of $${creatorTotal.toFixed(2)} ($${(creatorTotal - tolerance).toFixed(2)} - $${(creatorTotal + tolerance).toFixed(2)})`,
        variant: "destructive" 
      });
      return;
    }

    // Remove joiner's items from inventory
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

    // Determine winner
    const result: 'heads' | 'tails' = Math.random() < 0.5 ? 'heads' : 'tails';
    const winnerId = result === game.creator_side ? game.creator_id : user.id;

    const joinerItemsData = selectedItems.map(si => ({
      item_id: si.item.id,
      name: si.item.name,
      value: si.item.value,
      quantity: si.quantity,
      image_url: si.item.image_url,
      rarity: si.item.rarity
    }));

    // Update game
    await supabase
      .from("coinflip_games")
      .update({
        joiner_id: user.id,
        joiner_items: joinerItemsData,
        winner_id: winnerId,
        result: result,
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq("id", game.id);

    // Give all items to winner (95% of total, 5% house edge)
    const allItems = [...game.creator_items, ...joinerItemsData];
    for (const item of allItems) {
      const adjustedQty = Math.floor(item.quantity * 0.95);
      if (adjustedQty > 0) {
        const { data: existingItem } = await supabase
          .from('user_items')
          .select('*')
          .eq('user_id', winnerId)
          .eq('item_id', item.item_id)
          .single();

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

    toast({
      title: winnerId === user.id ? "You won! 🎉" : "You lost 😢",
      description: `Result: ${result.toUpperCase()}`
    });

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
    <div className="min-h-screen w-full flex">
      <Sidebar />
      
      <div className="flex-1 ml-64 mr-96">
        <TopBar />
        
        <main className="pt-16 px-12 py-8">
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow">
                <Coins className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Coinflip</h1>
                <p className="text-muted-foreground">50/50 chance to double your items</p>
              </div>
            </div>

            {/* Create Game Section */}
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Create New Game</h2>
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

                <div>
                  <label className="text-sm font-medium mb-2 block">Choose Side</label>
                  <div className="flex gap-3">
                    <Button
                      variant={selectedSide === 'heads' ? 'default' : 'outline'}
                      className="flex-1"
                      onClick={() => setSelectedSide('heads')}
                    >
                      Heads
                    </Button>
                    <Button
                      variant={selectedSide === 'tails' ? 'default' : 'outline'}
                      className="flex-1"
                      onClick={() => setSelectedSide('tails')}
                    >
                      Tails
                    </Button>
                  </div>
                </div>

                <Button onClick={createGame} className="w-full" size="lg" disabled={selectedItems.length === 0}>
                  Create Game
                </Button>
              </div>
            </Card>

            {/* Active Games */}
            <div>
              <h2 className="text-xl font-bold mb-4">Active Games</h2>
              {games.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">No active games. Create one to get started!</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {games.map((game) => {
                    const betAmount = parseFloat(game.bet_amount);
                    const minBet = betAmount * 0.9;
                    const maxBet = betAmount * 1.1;
                    const userTotal = getTotalValue();
                    const canJoin = userTotal >= minBet && userTotal <= maxBet && selectedItems.length > 0 && game.creator_id !== user?.id;

                    return (
                      <Card 
                        key={game.id} 
                        className={`overflow-hidden border-2 transition-all duration-300 ${
                          canJoin ? 'border-primary/50 hover:border-primary shadow-glow' : 'border-border'
                        }`}
                      >
                        {/* Header with creator info */}
                        <div className="bg-gradient-to-br from-card to-muted/50 p-4 border-b border-border">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                                <span className="text-xs font-bold text-primary">
                                  {(game.profiles?.username || 'U')[0].toUpperCase()}
                                </span>
                              </div>
                              <p className="font-semibold">{game.profiles?.username || 'Unknown'}</p>
                            </div>
                            <Badge variant={game.creator_side === 'heads' ? 'default' : 'secondary'}>
                              {game.creator_side.toUpperCase()}
                            </Badge>
                          </div>
                          <div className="text-center">
                            <p className="text-3xl font-bold text-primary">${betAmount.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Match within: ${minBet.toFixed(2)} - ${maxBet.toFixed(2)}
                            </p>
                          </div>
                        </div>

                        {/* Items display */}
                        {game.creator_items && game.creator_items.length > 0 && (
                          <div className="p-4 bg-muted/30">
                            <div className="grid grid-cols-3 gap-2 max-h-32 overflow-y-auto scrollbar-hide">
                              {game.creator_items.slice(0, 6).map((item: any, idx: number) => (
                                <div key={idx} className="relative group">
                                  <div className="aspect-square bg-card rounded-lg border border-border overflow-hidden">
                                    {item.image_url ? (
                                      <img 
                                        src={item.image_url} 
                                        alt={item.name} 
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center bg-muted">
                                        <Package className="w-6 h-6 text-muted-foreground" />
                                      </div>
                                    )}
                                  </div>
                                  {item.quantity > 1 && (
                                    <div className="absolute top-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                                      x{item.quantity}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                            {game.creator_items.length > 6 && (
                              <p className="text-xs text-center text-muted-foreground mt-2">
                                +{game.creator_items.length - 6} more items
                              </p>
                            )}
                          </div>
                        )}

                        {/* Join button */}
                        <div className="p-4">
                          <Button
                            onClick={() => joinGame(game)}
                            disabled={!canJoin}
                            className="w-full"
                            size="lg"
                          >
                            {game.creator_id === user?.id 
                              ? 'Your Game' 
                              : selectedItems.length === 0 
                                ? 'Select Items' 
                                : !canJoin && selectedItems.length > 0
                                  ? 'Invalid Bet Amount'
                                  : 'Join Battle'
                            }
                          </Button>
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

export default Coinflip;
