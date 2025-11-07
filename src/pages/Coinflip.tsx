import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { LiveChat } from "@/components/LiveChat";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Coins, Package, Plus, Minus, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { UserInventoryDialog } from "@/components/UserInventoryDialog";
import coinHeads from "@/assets/coin-heads.png";
import coinTails from "@/assets/coin-tails.png";

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

interface FlipAnimation {
  gameId: string;
  isFlipping: boolean;
  countdown: number;
  result: 'heads' | 'tails' | null;
}

const Coinflip = () => {
  const [games, setGames] = useState<CoinflipGame[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [selectedSide, setSelectedSide] = useState<'heads' | 'tails'>('heads');
  const [user, setUser] = useState<any>(null);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [flipAnimation, setFlipAnimation] = useState<FlipAnimation | null>(null);
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

    // Check for expired games every 10 seconds
    const expiryInterval = setInterval(() => {
      checkExpiredGames();
    }, 10000);

    return () => {
      supabase.removeChannel(gamesChannel);
      clearInterval(expiryInterval);
    };
  }, []);

  const checkExpiredGames = async () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data: expiredGames } = await supabase
      .from("coinflip_games")
      .select("*")
      .eq("status", "waiting")
      .lt("created_at", fiveMinutesAgo);

    if (expiredGames && expiredGames.length > 0) {
      for (const game of expiredGames) {
        await refundGame(game);
      }
    }
  };

  const refundGame = async (game: any) => {
    // Refund items to creator
    if (game.creator_items && game.creator_items.length > 0) {
      for (const item of game.creator_items) {
        const { data: existingItem } = await supabase
          .from('user_items')
          .select('*')
          .eq('user_id', game.creator_id)
          .eq('item_id', item.item_id)
          .single();

        if (existingItem) {
          await supabase
            .from('user_items')
            .update({ quantity: existingItem.quantity + item.quantity })
            .eq('id', existingItem.id);
        } else {
          await supabase
            .from('user_items')
            .insert({
              user_id: game.creator_id,
              item_id: item.item_id,
              quantity: item.quantity
            });
        }
      }
    }

    // Update game status
    await supabase
      .from("coinflip_games")
      .update({ status: 'expired' })
      .eq("id", game.id);

    toast({ 
      title: "Game Expired", 
      description: "Your coinflip game timed out and items were refunded.",
      variant: "default" 
    });
  };

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

    const { data: newGame, error } = await supabase.from("coinflip_games").insert({
      creator_id: user.id,
      bet_amount: getTotalValue(),
      creator_side: selectedSide,
      creator_items: itemsData,
      status: 'waiting'
    }).select().single();

    if (error) {
      toast({ title: "Error creating game", description: error.message, variant: "destructive" });
      return;
    }

    // Record bet transaction
    await supabase.from("transactions").insert({
      user_id: user.id,
      amount: -getTotalValue(),
      type: 'bet',
      game_type: 'coinflip',
      game_id: newGame.id,
      description: `Created coinflip game (${selectedSide})`
    });

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

    const joinerItemsData = selectedItems.map(si => ({
      item_id: si.item.id,
      name: si.item.name,
      value: si.item.value,
      quantity: si.quantity,
      image_url: si.item.image_url,
      rarity: si.item.rarity
    }));

    // Start flip animation with countdown
    const result: 'heads' | 'tails' = Math.random() < 0.5 ? 'heads' : 'tails';
    const winnerId = result === game.creator_side ? game.creator_id : user.id;

    // Show countdown and flip animation
    setFlipAnimation({ gameId: game.id, isFlipping: false, countdown: 5, result: null });
    
    // Countdown
    let countdown = 5;
    const countdownInterval = setInterval(() => {
      countdown--;
      setFlipAnimation(prev => prev ? { ...prev, countdown } : null);
      if (countdown === 0) {
        clearInterval(countdownInterval);
        // Start flip
        setFlipAnimation(prev => prev ? { ...prev, isFlipping: true, countdown: 0 } : null);
        
        // Show result after flip animation
        setTimeout(() => {
          setFlipAnimation(prev => prev ? { ...prev, result, isFlipping: false } : null);
          completeGame(game, joinerItemsData, winnerId, result);
        }, 2000);
      }
    }, 1000);
  };

  const completeGame = async (
    game: CoinflipGame,
    joinerItemsData: any[], 
    winnerId: string, 
    result: 'heads' | 'tails'
  ) => {
    const creatorTotal = parseFloat(game.bet_amount);
    const joinerTotal = joinerItemsData.reduce((sum, item) => sum + (item.value * item.quantity), 0);

    // Record joiner bet transaction
    await supabase.from("transactions").insert({
      user_id: user?.id,
      amount: -joinerTotal,
      type: 'bet',
      game_type: 'coinflip',
      game_id: game.id,
      description: `Joined coinflip game`
    });

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

    // Calculate total pot value (with 5% house edge)
    const totalPot = creatorTotal + joinerTotal;
    const winnerAmount = totalPot * 0.95;

    // Record winner transaction
    await supabase.from("transactions").insert({
      user_id: winnerId,
      amount: winnerAmount,
      type: 'win',
      game_type: 'coinflip',
      game_id: game.id,
      description: `Won coinflip (${result})`
    });

    // Record loser transaction
    const loserId = winnerId === game.creator_id ? user.id : game.creator_id;
    await supabase.from("transactions").insert({
      user_id: loserId,
      amount: 0,
      type: 'loss',
      game_type: 'coinflip',
      game_id: game.id,
      description: `Lost coinflip (${result})`
    });

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
      title: winnerId === user?.id ? "You won! 🎉" : "You lost 😢",
      description: `Result: ${result.toUpperCase()}`
    });

    setSelectedItems([]);
    
    // Clear flip animation after showing result
    setTimeout(() => {
      setFlipAnimation(null);
    }, 3000);
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

            {/* Flip Animation Modal */}
            {flipAnimation && (
              <div className="fixed inset-0 bg-background/95 z-50 flex items-center justify-center">
                <div className="text-center space-y-8">
                  {flipAnimation.countdown > 0 ? (
                    <>
                      <h2 className="text-4xl font-bold">Flipping in...</h2>
                      <div className="text-8xl font-bold text-primary animate-pulse">
                        {flipAnimation.countdown}
                      </div>
                    </>
                  ) : flipAnimation.isFlipping ? (
                    <>
                      <h2 className="text-4xl font-bold">Flipping Coin...</h2>
                      <div className="relative w-48 h-48 mx-auto">
                        <img 
                          src={coinHeads} 
                          alt="Coin" 
                          className="absolute inset-0 w-full h-full animate-[spin_0.5s_linear_infinite]"
                          style={{ backfaceVisibility: 'hidden' }}
                        />
                      </div>
                    </>
                  ) : flipAnimation.result ? (
                    <>
                      <h2 className="text-4xl font-bold mb-4">Result:</h2>
                      <div className="relative w-48 h-48 mx-auto animate-scale-in">
                        <img 
                          src={flipAnimation.result === 'heads' ? coinHeads : coinTails} 
                          alt={flipAnimation.result} 
                          className="w-full h-full"
                        />
                      </div>
                      <p className="text-6xl font-bold text-primary uppercase animate-fade-in">
                        {flipAnimation.result}!
                      </p>
                    </>
                  ) : null}
                </div>
              </div>
            )}

            {/* Active Games */}
            <div>
              <h2 className="text-xl font-bold mb-4">Active Games</h2>
              {games.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">No active games. Create one to get started!</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {games.map((game) => {
                    const timeLeft = Math.max(0, 300 - Math.floor((Date.now() - new Date(game.created_at).getTime()) / 1000));
                    const minutes = Math.floor(timeLeft / 60);
                    const seconds = timeLeft % 60;
                    const betAmount = parseFloat(game.bet_amount);
                    const minBet = betAmount * 0.9;
                    const maxBet = betAmount * 1.1;
                    const userTotal = getTotalValue();
                    const canJoin = userTotal >= minBet && userTotal <= maxBet && selectedItems.length > 0 && game.creator_id !== user?.id;

                    return (
                      <Card 
                        key={game.id} 
                        className={`overflow-hidden border transition-all duration-300 ${
                          canJoin ? 'border-primary/50 hover:border-primary shadow-glow' : 'border-border'
                        }`}
                      >
                        <div className="flex items-center gap-4 p-4">
                          {/* Creator Section - Compact */}
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {/* Coin Image */}
                            <img 
                              src={game.creator_side === 'heads' ? coinHeads : coinTails} 
                              alt={game.creator_side}
                              className="w-12 h-12 flex-shrink-0"
                            />
                            
                            {/* Creator Info */}
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-bold text-primary">
                                  {(game.profiles?.username || 'U')[0].toUpperCase()}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-sm truncate">{game.profiles?.username || 'Unknown'}</p>
                                <p className="text-xs text-muted-foreground">{game.creator_side.toUpperCase()}</p>
                              </div>
                            </div>
                            
                            {/* Bet Amount */}
                            <div className="text-right flex-shrink-0">
                              <p className="text-xl font-bold text-primary">${betAmount.toFixed(2)}</p>
                              <p className="text-xs text-muted-foreground">
                                ${minBet.toFixed(0)}-${maxBet.toFixed(0)}
                              </p>
                            </div>
                          </div>

                          {/* Timer */}
                          <div className="flex items-center gap-2 px-3 border-l border-border">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-mono">
                              {minutes}:{String(seconds).padStart(2, '0')}
                            </span>
                          </div>

                          {/* VS Icon */}
                          <div className="flex items-center justify-center px-3 border-l border-border">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm font-bold shadow-glow">
                              VS
                            </div>
                          </div>

                          {/* Join Button */}
                          <div className="flex items-center px-3">
                            <Button
                              onClick={() => joinGame(game)}
                              disabled={!canJoin}
                              size="sm"
                              className="min-w-[100px]"
                            >
                              {game.creator_id === user?.id 
                                ? 'Waiting' 
                                : !canJoin && selectedItems.length === 0
                                ? 'Select Items'
                                : !canJoin
                                ? 'Out of Range'
                                : 'Join'
                              }
                            </Button>
                          </div>
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
