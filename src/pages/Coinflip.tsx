import { useState, useEffect, useRef } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { LiveChat } from "@/components/LiveChat";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Coins, Package, Plus, Minus, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { UserInventoryDialog } from "@/components/UserInventoryDialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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
  const [recentFlips, setRecentFlips] = useState<Array<'heads' | 'tails'>>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [gameToJoin, setGameToJoin] = useState<CoinflipGame | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Keep an up-to-date reference to the current user for interval callbacks
  const userRef = useRef<any>(null);
  const lastCleanupRef = useRef<number>(0);
  useEffect(() => { userRef.current = user; }, [user]);

  useEffect(() => {
    checkUser();
    fetchGames();
    fetchRecentFlips();
    
    const gamesChannel = supabase
      .channel('coinflip-games-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coinflip_games' }, () => {
        fetchGames();
      })
      .subscribe();

    // Update current time every second for live countdown
    const timeInterval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    // Check for expired games every second to handle UI timer expiry
    const expiryInterval = setInterval(() => {
      checkExpiredGames();
    }, 1000);

    return () => {
      supabase.removeChannel(gamesChannel);
      clearInterval(timeInterval);
      clearInterval(expiryInterval);
    };
  }, []);

  const checkExpiredGames = async () => {
    const currentUserId = userRef.current?.id;
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    // Locally expire ONLY your own games (respect RLS)
    if (currentUserId) {
      const { data: expiredGames, error } = await supabase
        .from("coinflip_games")
        .select("*")
        .eq("status", "waiting")
        .lte("created_at", fiveMinutesAgo)
        .eq("creator_id", currentUserId);

      if (!error && expiredGames && expiredGames.length > 0) {
        for (const game of expiredGames) {
          await refundGame(game);
        }
      }
    }

    // Throttle a global cleanup that expires ANY old waiting games server-side
    if (Date.now() - (lastCleanupRef.current || 0) > 30000) {
      lastCleanupRef.current = Date.now();
      try {
        await supabase.functions.invoke('cleanup-coinflip');
      } catch (e) {
        // silently ignore
      }
    }
  };

  const refundGame = async (game: any) => {
    // Try to atomically mark the game as expired first so only one client refunds
    const { data: lockedGame, error: lockError } = await supabase
      .from("coinflip_games")
      .update({ status: 'expired', completed_at: new Date().toISOString(), result: 'refund' })
      .eq('id', game.id)
      .eq('status', 'waiting')
      .select('id')
      .single();

    // If no row was updated, someone else already handled the refund/expiry
    if (lockError || !lockedGame) return;

    // Refund items to creator (idempotent per atomic lock above)
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

    // Delete the expired game from database
    const { error: delErr } = await supabase.from("coinflip_games").delete().eq("id", game.id);
    if (delErr) {
      console.error('Failed to delete expired game:', delErr);
    }

    // Remove the expired game locally right away
    setGames((prev) => prev.filter((g) => g.id !== game.id));

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

  const fetchRecentFlips = async () => {
    // Get unique coinflip game results from transactions
    const { data } = await supabase
      .from("transactions")
      .select("game_id, description")
      .eq("game_type", "coinflip")
      .eq("type", "win")
      .order("created_at", { ascending: false })
      .limit(100);

    if (data) {
      // Extract unique games with their results
      const seenGames = new Set();
      const flips = data
        .map(t => {
          if (seenGames.has(t.game_id)) return null;
          seenGames.add(t.game_id);
          const match = t.description?.match(/\((\w+)\)/);
          return match ? match[1] as 'heads' | 'tails' : null;
        })
        .filter((f): f is 'heads' | 'tails' => f !== null)
        .slice(0, 100);
      setRecentFlips(flips);
    }
  };

  const fetchGames = async () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("coinflip_games")
      .select("*")
      .eq("status", "waiting")
      .gt("created_at", fiveMinutesAgo)
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
        .select("id, username, avatar_url, roblox_username")
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
    if (isCreating) return;
    
    if (!user) {
      toast({ title: "Please login first", variant: "destructive" });
      return;
    }

    if (selectedItems.length === 0) {
      toast({ title: "Please select items to bet", variant: "destructive" });
      return;
    }

    setIsCreating(true);

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

    // Record bet transaction for live activity
    const betAmount = getTotalValue();
    console.log('Creating coinflip bet transaction:', { 
      user_id: user.id, 
      amount: betAmount, 
      game_id: newGame.id 
    });
    
    const { error: transactionError } = await supabase.from("transactions").insert({
      user_id: user.id,
      amount: betAmount,
      type: 'bet',
      game_type: 'coinflip',
      game_id: newGame.id,
      description: `Created coinflip game (${selectedSide})`
    });

    if (transactionError) {
      console.error('Error creating transaction:', transactionError);
    } else {
      console.log('Transaction created successfully!');
    }

    setSelectedItems([]);
    setIsCreating(false);
    toast({ title: "Game created!", description: "Waiting for opponent..." });
  };

  const handleJoinClick = (game: CoinflipGame) => {
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

    // Show confirmation dialog
    setGameToJoin(game);
  };

  const joinGame = async (game: CoinflipGame) => {
    if (isJoining) return;
    
    setIsJoining(true);
    setGameToJoin(null);

    try {
      const joinerTotal = getTotalValue();
      const creatorTotal = parseFloat(game.bet_amount);
      const tolerance = creatorTotal * 0.1;

      if (joinerTotal < creatorTotal - tolerance || joinerTotal > creatorTotal + tolerance) {
        toast({ 
          title: "Invalid bet amount", 
          description: `Must be within 10% of $${creatorTotal.toFixed(2)} ($${(creatorTotal - tolerance).toFixed(2)} - $${(creatorTotal + tolerance).toFixed(2)})`,
          variant: "destructive" 
        });
        setIsJoining(false);
        return;
      }

      // Verify user still has the items before proceeding
      for (const si of selectedItems) {
        const { data: userItem, error: checkError } = await supabase
          .from('user_items')
          .select('*')
          .eq('user_id', user.id)
          .eq('item_id', si.item.id)
          .single();

        if (checkError || !userItem || userItem.quantity < si.quantity) {
          toast({ 
            title: `Not enough ${si.item.name}`, 
            description: "Please refresh and try again",
            variant: "destructive" 
          });
          setIsJoining(false);
          return;
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

      // Generate result using crypto-secure randomness
      const randomArray = new Uint32Array(1);
      crypto.getRandomValues(randomArray);
      const result: 'heads' | 'tails' = (randomArray[0] % 2) === 0 ? 'heads' : 'tails';
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
    } catch (error: any) {
      console.error('Error joining game:', error);
      toast({ 
        title: "Error joining game", 
        description: error.message || "Something went wrong",
        variant: "destructive" 
      });
      setIsJoining(false);
    }
  };

  const completeGame = async (
    game: CoinflipGame,
    joinerItemsData: any[], 
    winnerId: string, 
    result: 'heads' | 'tails'
  ) => {
    try {
      const creatorTotal = parseFloat(game.bet_amount);
      const joinerTotal = joinerItemsData.reduce((sum, item) => sum + (item.value * item.quantity), 0);

      // Remove joiner's items from inventory first
      for (const si of selectedItems) {
        const { data: userItem, error: fetchError } = await supabase
          .from('user_items')
          .select('*')
          .eq('user_id', user.id)
          .eq('item_id', si.item.id)
          .single();

        if (fetchError || !userItem || userItem.quantity < si.quantity) {
          throw new Error(`Item ${si.item.name} not available`);
        }

        const newQty = userItem.quantity - si.quantity;
        if (newQty === 0) {
          const { error: delError } = await supabase
            .from('user_items')
            .delete()
            .eq('id', userItem.id);
          if (delError) throw delError;
        } else {
          const { error: updateError } = await supabase
            .from('user_items')
            .update({ quantity: newQty })
            .eq('id', userItem.id);
          if (updateError) throw updateError;
        }
      }

      // Update game with results
      const { error: updateError } = await supabase
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

      if (updateError) {
        console.error('Failed to update coinflip game:', updateError);
        throw new Error('Failed to complete game: ' + updateError.message);
      }

      // Record joiner bet transaction
      await supabase.from("transactions").insert({
        user_id: user?.id,
        amount: -joinerTotal,
        type: 'bet',
        game_type: 'coinflip',
        game_id: game.id,
        description: `Joined coinflip game`
      });

      // Record winner transaction (no house edge on transaction, but on items)
      await supabase.from("transactions").insert({
        user_id: winnerId,
        amount: creatorTotal + joinerTotal,
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

      // Give ALL items to winner (winner takes all, no house edge)
      const allItems = [...game.creator_items, ...joinerItemsData];
      
      for (const item of allItems) {
        const { data: existingItem, error: fetchError } = await supabase
          .from('user_items')
          .select('*')
          .eq('user_id', winnerId)
          .eq('item_id', item.item_id)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          console.error('Error fetching existing item:', fetchError);
          continue;
        }

        if (existingItem) {
          const { error: updateError } = await supabase
            .from('user_items')
            .update({ quantity: existingItem.quantity + item.quantity })
            .eq('id', existingItem.id);
          
          if (updateError) {
            console.error('Error updating item quantity:', updateError);
          }
        } else {
          const { error: insertError } = await supabase
            .from('user_items')
            .insert({
              user_id: winnerId,
              item_id: item.item_id,
              quantity: item.quantity
            });
          
          if (insertError) {
            console.error('Error inserting new item:', insertError);
          }
        }
      }

      // Delete the completed game from database
      const { error: deleteError } = await supabase
        .from("coinflip_games")
        .delete()
        .eq("id", game.id);
      
      if (deleteError) {
        console.error('Failed to delete coinflip game:', deleteError);
      }

      toast({
        title: winnerId === user?.id ? "You won! 🎉" : "You lost 😢",
        description: `Result: ${result.toUpperCase()}. All items ${winnerId === user?.id ? 'added to your inventory!' : 'went to the winner.'}`,
        duration: 5000
      });

      // Remove the game from local list immediately
      setGames((prev) => prev.filter((g) => g.id !== game.id));

      // Refresh recent flips
      fetchRecentFlips();

      setSelectedItems([]);
      setIsJoining(false);
      
      // Clear flip animation after showing result
      setTimeout(() => {
        setFlipAnimation(null);
      }, 3000);

    } catch (error: any) {
      console.error('Error completing game:', error);
      toast({
        title: "Error completing game",
        description: error.message || "Something went wrong. Please refresh the page.",
        variant: "destructive",
        duration: 5000
      });
      setIsJoining(false);
      setFlipAnimation(null);
      
      // Refresh the page data
      fetchGames();
    }
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

            {/* Last 100 Flips */}
            {recentFlips.length > 0 && (
              <Card className="p-4">
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Last 100 Flips</h3>
                <div className="flex gap-1 overflow-x-auto scrollbar-hide">
                  {recentFlips.map((flip, idx) => (
                    <div 
                      key={idx} 
                      className="relative w-6 h-6 rounded-full overflow-hidden bg-transparent flex-shrink-0"
                      title={flip}
                    >
                      <img 
                        src={flip === 'heads' ? coinHeads : coinTails} 
                        alt={flip}
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-black text-white drop-shadow-[0_0_4px_rgba(0,0,0,1)]">
                          {flip === 'heads' ? 'H' : 'T'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

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

                <Button onClick={createGame} className="w-full" size="lg" disabled={selectedItems.length === 0 || isCreating}>
                  {isCreating ? 'Creating...' : 'Create Game'}
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
                      <div className="relative w-48 h-48 mx-auto rounded-full overflow-hidden bg-transparent">
                        <img 
                          src={coinHeads} 
                          alt="Coin" 
                          className="absolute inset-0 w-full h-full object-contain animate-[spin_0.5s_linear_infinite]"
                          style={{ backfaceVisibility: 'hidden' }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-8xl font-black text-white drop-shadow-[0_0_8px_rgba(0,0,0,0.9)] animate-[spin_0.5s_linear_infinite]">H</span>
                        </div>
                      </div>
                    </>
                  ) : flipAnimation.result ? (
                    <>
                      <h2 className="text-4xl font-bold mb-4">Result:</h2>
                      <div className="relative w-48 h-48 mx-auto animate-scale-in rounded-full overflow-hidden bg-transparent">
                        <img 
                          src={flipAnimation.result === 'heads' ? coinHeads : coinTails} 
                          alt={flipAnimation.result} 
                          className="w-full h-full object-contain"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-8xl font-black text-white drop-shadow-[0_0_10px_rgba(0,0,0,1)]">
                            {flipAnimation.result === 'heads' ? 'H' : 'T'}
                          </span>
                        </div>
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
                    const timeLeft = Math.max(0, 300 - Math.floor((currentTime - new Date(game.created_at).getTime()) / 1000));
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
                            <div className="relative w-12 h-12 rounded-full overflow-hidden bg-transparent flex-shrink-0">
                              <img 
                                src={game.creator_side === 'heads' ? coinHeads : coinTails} 
                                alt={game.creator_side}
                                className="w-full h-full object-contain"
                              />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-2xl font-black text-white drop-shadow-[0_0_6px_rgba(0,0,0,1)]">
                                  {game.creator_side === 'heads' ? 'H' : 'T'}
                                </span>
                              </div>
                            </div>
                            
                            {/* Creator Info */}
                            <div className="flex items-center gap-2 min-w-0">
                              <Avatar className="w-8 h-8 flex-shrink-0">
                                <AvatarImage src={game.profiles?.avatar_url || undefined} />
                                <AvatarFallback className="text-xs bg-primary/20 text-primary font-bold">
                                  {(game.profiles?.roblox_username || game.profiles?.username || 'U')[0].toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="font-semibold text-sm truncate">{game.profiles?.roblox_username || game.profiles?.username || 'Unknown'}</p>
                                <p className="text-xs text-muted-foreground">{game.creator_side.toUpperCase()}</p>
                              </div>
                            </div>
                            
                            {/* Bet Amount & Items */}
                            <div className="text-right flex-shrink-0">
                              <div className="flex items-center gap-2 justify-end">
                                <p className="text-xl font-bold text-primary">${betAmount.toFixed(2)}</p>
                                {game.creator_items && game.creator_items.length > 0 && (
                                  <div className="flex items-center gap-0.5">
                                    {game.creator_items.slice(0, 3).map((item: any, idx: number) => (
                                      <div 
                                        key={idx}
                                        className="relative w-5 h-5 rounded bg-muted border border-border/50 overflow-hidden"
                                        title={`${item.name} x${item.quantity}`}
                                      >
                                        {item.image_url ? (
                                          <img 
                                            src={item.image_url} 
                                            alt={item.name}
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center text-[8px]">
                                            {item.name[0]}
                                          </div>
                                        )}
                                        {item.quantity > 1 && (
                                          <span className="absolute bottom-0 right-0 text-[7px] bg-black/70 px-0.5 rounded-tl">
                                            {item.quantity}
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                    {game.creator_items.length > 3 && (
                                      <span className="text-[9px] text-muted-foreground">
                                        +{game.creator_items.length - 3}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
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
                              onClick={() => {
                                if (game.creator_id === user?.id) return;
                                if (selectedItems.length === 0) {
                                  setInventoryOpen(true);
                                } else {
                                  handleJoinClick(game);
                                }
                              }}
                              disabled={isJoining || game.creator_id === user?.id}
                              size="sm"
                              className="min-w-[100px]"
                            >
                              {isJoining
                                ? 'Joining...'
                                : game.creator_id === user?.id
                                ? 'Waiting' 
                                : selectedItems.length === 0
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

      {/* Join Confirmation Dialog */}
      <AlertDialog open={!!gameToJoin} onOpenChange={(open) => !open && setGameToJoin(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Join Game</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>Are you sure you want to join this coinflip game?</p>
              
              {gameToJoin && (
                <div className="space-y-2 text-foreground">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm">Opponent:</span>
                    <span className="font-semibold">{gameToJoin.profiles?.roblox_username || gameToJoin.profiles?.username || 'Unknown'}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm">Opponent Side:</span>
                    <span className="font-semibold uppercase">{gameToJoin.creator_side}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm">Your Side:</span>
                    <span className="font-semibold uppercase">{gameToJoin.creator_side === 'heads' ? 'TAILS' : 'HEADS'}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm">Bet Amount:</span>
                    <span className="font-bold text-primary">${parseFloat(gameToJoin.bet_amount).toFixed(2)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <span className="text-sm">Your Items Value:</span>
                    <span className="font-bold text-primary">${getTotalValue().toFixed(2)}</span>
                  </div>

                  {selectedItems.length > 0 && (
                    <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                      <span className="text-sm">Your Items ({selectedItems.length}):</span>
                      <div className="flex flex-wrap gap-2">
                        {selectedItems.map((si) => (
                          <div key={si.item.id} className="flex items-center gap-1 text-xs bg-background/50 px-2 py-1 rounded">
                            {si.item.image_url && (
                              <img src={si.item.image_url} alt={si.item.name} className="w-4 h-4 object-cover rounded" />
                            )}
                            <span>{si.item.name}</span>
                            <span className="text-muted-foreground">x{si.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => gameToJoin && joinGame(gameToJoin)}>
              Confirm Join
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Coinflip;
