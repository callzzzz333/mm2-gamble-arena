import { useState, useEffect, useMemo, useCallback } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { LiveChat } from "@/components/LiveChat";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Coins, Package, Plus, Minus } from "lucide-react";
import { UserInventoryDialog } from "@/components/UserInventoryDialog";
import { JoinCoinflipDialog } from "@/components/JoinCoinflipDialog";
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
  result: "heads" | "tails" | null;
  showResult: boolean;
}

const Coinflip = () => {
  const [games, setGames] = useState<CoinflipGame[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [selectedSide, setSelectedSide] = useState<"heads" | "tails">("heads");
  const { user } = useAuth();
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [flipAnimation, setFlipAnimation] = useState<FlipAnimation | null>(null);
  const [recentFlips, setRecentFlips] = useState<Array<"heads" | "tails">>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [gameToJoin, setGameToJoin] = useState<CoinflipGame | null>(null);
  const [gameToJoinRef, setGameToJoinRef] = useState<CoinflipGame | null>(null);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchGames();
    fetchRecentFlips();

    // Track active countdown intervals to clean up properly
    const activeIntervals = new Map<string, number>();

    const gamesChannel = supabase
      .channel("coinflip-games-changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "coinflip_games",
        },
        async (payload) => {
          const updatedGame = payload.new as CoinflipGame;

          // When a game gets a joiner, start animation for both users
          if (updatedGame.joiner_id && !activeIntervals.has(updatedGame.id)) {
            console.log("Game joined, starting animation for game:", updatedGame.id);
            
            // Fetch profile data for complete game object
            const { data: profile } = await supabase
              .from("profiles")
              .select("id, username, avatar_url, roblox_username")
              .eq("id", updatedGame.creator_id)
              .single();

            const gameWithProfile = { ...updatedGame, profiles: profile };
            setGameToJoinRef(gameWithProfile);
            
            setFlipAnimation({
              gameId: updatedGame.id,
              isFlipping: false,
              countdown: 5,
              result: null,
              showResult: false,
            });

            // Start countdown with smooth progress
            let countdown = 5;
            const countdownInterval = window.setInterval(() => {
              setFlipAnimation((prev) => {
                if (!prev || prev.gameId !== updatedGame.id) {
                  clearInterval(countdownInterval);
                  activeIntervals.delete(updatedGame.id);
                  return prev;
                }

                countdown--;
                console.log("Countdown:", countdown);

                if (countdown <= 0) {
                  clearInterval(countdownInterval);
                  activeIntervals.delete(updatedGame.id);
                  return { ...prev, isFlipping: true, countdown: 0 };
                }

                return { ...prev, countdown };
              });
            }, 1000);

            activeIntervals.set(updatedGame.id, countdownInterval);
          }

          // When game is completed, show result after countdown + flip
          if (updatedGame.status === "completed" && updatedGame.result) {
            console.log("Game completed, will reveal after animations:", updatedGame.result);

            // Capture remaining countdown at this exact moment
            const remaining = (flipAnimation && flipAnimation.gameId === updatedGame.id)
              ? Math.max(0, flipAnimation.countdown)
              : 0;
            const showDelay = remaining * 1000 + 3000; // wait remaining countdown + 3s flip
            const clearDelay = showDelay + 3000;       // keep result visible +3s

            // Store result immediately so we know what to reveal later
            setFlipAnimation((prev) => {
              if (!prev || prev.gameId !== updatedGame.id) return prev;
              return { ...prev, result: updatedGame.result as "heads" | "tails" };
            });

            // Reveal result after the full sequence
            window.setTimeout(() => {
              setFlipAnimation((prev) => {
                if (!prev || prev.gameId !== updatedGame.id) return prev;
                return { ...prev, isFlipping: false, showResult: true };
              });

              if (user && (updatedGame.creator_id === user.id || updatedGame.joiner_id === user.id)) {
                toast({
                  title: updatedGame.winner_id === user.id ? "You Won" : "You Lost",
                  description: `Result: ${updatedGame.result.toUpperCase()}. Items have been paid out.`,
                  duration: 5000,
                });
              }

              fetchRecentFlips();
            }, showDelay);

            // Clear animation state after showing the result for a bit
            window.setTimeout(() => {
              setFlipAnimation((prev) => (prev?.gameId === updatedGame.id ? null : prev));
              setGameToJoinRef((prev) => (prev?.id === updatedGame.id ? null : prev));
            }, clearDelay);
          }

          fetchGames();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "coinflip_games",
        },
        () => {
          fetchGames();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "coinflip_games",
        },
        (payload) => {
          const deletedGame = payload.old as CoinflipGame;
          console.log("Game deleted:", deletedGame.id);

          // Clean up any active intervals
          const interval = activeIntervals.get(deletedGame.id);
          if (interval) {
            clearInterval(interval);
            activeIntervals.delete(deletedGame.id);
          }

          // Preserve animation state on delete; timers will clear it

          fetchGames();
        },
      )
      .subscribe();

    return () => {
      // Clean up all active intervals
      activeIntervals.forEach((interval) => clearInterval(interval));
      activeIntervals.clear();
      supabase.removeChannel(gamesChannel);
    };
  }, [user, flipAnimation, toast]);

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
        .map((t) => {
          if (seenGames.has(t.game_id)) return null;
          seenGames.add(t.game_id);
          const match = t.description?.match(/\((\w+)\)/);
          return match ? (match[1] as "heads" | "tails") : null;
        })
        .filter((f): f is "heads" | "tails" => f !== null)
        .slice(0, 100);
      setRecentFlips(flips);
    }
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
      const creatorIds = data.map((game) => game.creator_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, roblox_username")
        .in("id", creatorIds);

      const gamesWithProfiles = data.map((game) => ({
        ...game,
        profiles: profiles?.find((p) => p.id === game.creator_id),
      }));

      setGames((gamesWithProfiles as any) || []);
    } else {
      setGames((data as any) || []);
    }
  };

  const handleSelectItem = useCallback((itemWithQty: Item & { quantity: number }) => {
    setSelectedItems((prev) => {
      const existing = prev.find((si) => si.item.id === itemWithQty.id);
      if (existing) {
        return prev.map((si) => (si.item.id === itemWithQty.id ? { ...si, quantity: si.quantity + 1 } : si));
      } else {
        const { quantity, ...item } = itemWithQty;
        return [...prev, { item, quantity: 1 }];
      }
    });
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setSelectedItems((prev) => {
      const existing = prev.find((si) => si.item.id === itemId);
      if (existing && existing.quantity > 1) {
        return prev.map((si) => (si.item.id === itemId ? { ...si, quantity: si.quantity - 1 } : si));
      } else {
        return prev.filter((si) => si.item.id !== itemId);
      }
    });
  }, []);

  const getTotalValue = useCallback(() => {
    return selectedItems.reduce((sum, si) => sum + si.item.value * si.quantity, 0);
  }, [selectedItems]);

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

    const itemsData = selectedItems.map((si) => ({
      item_id: si.item.id,
      name: si.item.name,
      value: si.item.value,
      quantity: si.quantity,
      image_url: si.item.image_url,
      rarity: si.item.rarity,
    }));

    try {
      const { data, error } = await supabase.functions.invoke("coinflip-create", {
        body: { items: itemsData, side: selectedSide },
      });

      if (error) throw new Error(error.message);

      setSelectedItems([]);
      setIsCreating(false);
      toast({ title: "Game created!", description: "Waiting for opponent..." });
      fetchGames();
    } catch (e: any) {
      console.error("Error creating game:", e);
      toast({ title: "Error creating game", description: e.message || "Please try again", variant: "destructive" });
      setIsCreating(false);
    }
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

    setGameToJoin(game);
    setJoinDialogOpen(true);
  };

  const joinGame = async (game: CoinflipGame, joinerItems: SelectedItem[]) => {
    if (isJoining) return;

    setIsJoining(true);
    setJoinDialogOpen(false);
    setGameToJoin(null);

    try {
      // Verify user still has the items before proceeding
      for (const si of joinerItems) {
        const { data: userItem, error: checkError } = await supabase
          .from("user_items")
          .select("*")
          .eq("user_id", user.id)
          .eq("item_id", si.item.id)
          .single();

        if (checkError || !userItem || userItem.quantity < si.quantity) {
          toast({
            title: `Not enough ${si.item.name}`,
            description: "Please refresh and try again",
            variant: "destructive",
          });
          setIsJoining(false);
          return;
        }
      }

      const joinerItemsData = joinerItems.map((si) => ({
        item_id: si.item.id,
        name: si.item.name,
        value: si.item.value,
        quantity: si.quantity,
        image_url: si.item.image_url,
        rarity: si.item.rarity,
      }));

      // Call edge function which will trigger realtime updates
      completeGame(game, joinerItemsData);
    } catch (error: any) {
      console.error("Error joining game:", error);
      toast({
        title: "Error joining game",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
      setIsJoining(false);
    }
  };

  const completeGame = async (game: CoinflipGame, joinerItemsData: any[]) => {
    try {
      // Call server to perform join, payout and cleanup
      const { data, error } = await supabase.functions.invoke("coinflip-join", {
        body: {
          gameId: game.id,
          joinerItems: joinerItemsData,
        },
      });

      if (error) {
        throw new Error(error.message || "Server error");
      }

      // Realtime will handle showing the animation and result
      setSelectedItems([]);
      setIsJoining(false);
    } catch (error: any) {
      console.error("Error completing game:", error);
      toast({
        title: "Error completing game",
        description: error.message || "Something went wrong. Please refresh and try again.",
        variant: "destructive",
        duration: 5000,
      });
      setIsJoining(false);
      setFlipAnimation(null);
      setGameToJoinRef(null);
      fetchGames();
    }
  };

  const getRarityColor = useCallback((rarity: string) => {
    const colors: any = {
      Godly: "bg-red-500/20 text-red-500",
      Ancient: "bg-purple-500/20 text-purple-500",
      Legendary: "bg-orange-500/20 text-orange-500",
      Rare: "bg-blue-500/20 text-blue-500",
      Uncommon: "bg-green-500/20 text-green-500",
      Common: "bg-gray-500/20 text-gray-500",
    };
    return colors[rarity] || "bg-gray-500/20 text-gray-500";
  }, []);

  // Keep animating game visible even if it leaves 'waiting'
  const displayedGames = useMemo(() => {
    if (gameToJoinRef && !games.some(g => g.id === gameToJoinRef.id)) {
      return [gameToJoinRef, ...games];
    }
    return games;
  }, [games, gameToJoinRef]);

  return (
    <div className="min-h-screen w-full flex">
      <Sidebar />

      <div className="flex-1 md:ml-64 md:mr-96">
        <TopBar />

        <main className="pt-20 md:pt-16 px-4 md:px-12 py-8">
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
                        src={flip === "heads" ? coinHeads : coinTails}
                        alt={flip}
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-black text-white drop-shadow-[0_0_4px_rgba(0,0,0,1)]">
                          {flip === "heads" ? "H" : "T"}
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
                    {selectedItems.length === 0 ? "Select from inventory" : `${selectedItems.length} items selected`}
                  </Button>

                  {selectedItems.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {selectedItems.map((si) => (
                        <div key={si.item.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                          {si.item.image_url && (
                            <img
                              src={si.item.image_url}
                              alt={si.item.name}
                              className="w-12 h-12 object-cover rounded"
                            />
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
                            <Button size="sm" variant="ghost" onClick={() => removeItem(si.item.id)}>
                              <Minus className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                      <div className="pt-2 border-t border-border">
                        <p className="text-lg font-bold">
                          Total: <span className="text-primary">${getTotalValue().toFixed(2)}</span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Choose Side</label>
                  <div className="flex gap-3">
                    <Button
                      variant={selectedSide === "heads" ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => setSelectedSide("heads")}
                    >
                      Heads
                    </Button>
                    <Button
                      variant={selectedSide === "tails" ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => setSelectedSide("tails")}
                    >
                      Tails
                    </Button>
                  </div>
                </div>

                <Button
                  onClick={createGame}
                  className="w-full"
                  size="lg"
                  disabled={selectedItems.length === 0 || isCreating}
                >
                  {isCreating ? "Creating..." : "Create Game"}
                </Button>
              </div>
            </Card>

            {/* Active Games */}
            <div>
              <h2 className="text-xl font-bold mb-4">Active Games</h2>
              {displayedGames.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">No active games. Create one to get started!</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {displayedGames.map((game) => {
                    const betAmount = parseFloat(game.bet_amount);
                    const minBet = betAmount * 0.9;
                    const maxBet = betAmount * 1.1;
                    const isAnimating = flipAnimation?.gameId === game.id;
                    const progress =
                      isAnimating && flipAnimation.countdown > 0 ? ((5 - flipAnimation.countdown) / 5) * 100 : 100;

                    return (
                      <Card
                        key={game.id}
                        className={`overflow-hidden border transition-all duration-300 ${
                          isAnimating ? "border-primary shadow-glow scale-105" : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-center gap-4 p-4">
                          {/* Creator Section - Compact */}
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {/* Coin Image with Animation */}
                            <div className="relative w-12 h-12 flex-shrink-0">
                              {/* Circular Progress Ring - Always show during countdown */}
                              {isAnimating && flipAnimation.countdown > 0 && (
                                <svg className="absolute inset-0 w-full h-full -rotate-90 z-10">
                                  <circle
                                    cx="24"
                                    cy="24"
                                    r="20"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    className="text-muted/30"
                                  />
                                  <circle
                                    cx="24"
                                    cy="24"
                                    r="20"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="3"
                                    strokeDasharray={`${2 * Math.PI * 20}`}
                                    strokeDashoffset={`${2 * Math.PI * 20 * (1 - progress / 100)}`}
                                    className="text-primary"
                                    strokeLinecap="round"
                                    style={{
                                      transition: `stroke-dashoffset ${flipAnimation.countdown > 0 ? '1s' : '0s'} linear`
                                    }}
                                  />
                                </svg>
                              )}

                              <div className="relative w-full h-full rounded-full overflow-hidden bg-transparent">
                                <img
                                  src={
                                    isAnimating && flipAnimation.showResult && flipAnimation.result
                                      ? flipAnimation.result === "heads"
                                        ? coinHeads
                                        : coinTails
                                      : game.creator_side === "heads"
                                        ? coinHeads
                                        : coinTails
                                  }
                                  alt={game.creator_side}
                                  className={`w-full h-full object-contain transition-transform ${
                                    isAnimating && flipAnimation.isFlipping && !flipAnimation.showResult
                                      ? "animate-[spin_3s_ease-in-out]"
                                      : ""
                                  }`}
                                />
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                  <span className="text-2xl font-black text-white drop-shadow-[0_0_6px_rgba(0,0,0,1)]">
                                    {isAnimating && flipAnimation.showResult && flipAnimation.result
                                      ? flipAnimation.result === "heads"
                                        ? "H"
                                        : "T"
                                      : game.creator_side === "heads"
                                        ? "H"
                                        : "T"}
                                  </span>
                                </div>

                                {/* Countdown Overlay */}
                                {isAnimating && flipAnimation.countdown > 0 && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-full z-20">
                                    <span className="text-2xl font-bold text-primary drop-shadow-lg animate-pulse">
                                      {flipAnimation.countdown}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Creator Info */}
                            <div className="flex items-center gap-2 min-w-0">
                              <Avatar className="w-8 h-8 flex-shrink-0">
                                <AvatarImage src={game.profiles?.avatar_url || undefined} />
                                <AvatarFallback className="text-xs bg-primary/20 text-primary font-bold">
                                  {(game.profiles?.roblox_username || game.profiles?.username || "U")[0].toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="font-semibold text-sm truncate">
                                  {game.profiles?.roblox_username || game.profiles?.username || "Unknown"}
                                </p>
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

                          {/* VS Icon */}
                          <div className="flex items-center justify-center px-3 border-l border-border">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm font-bold shadow-glow">
                              VS
                            </div>
                          </div>

                          {/* Join Button */}
                          <div className="flex items-center px-3">
                            <Button
                              onClick={() => handleJoinClick(game)}
                              disabled={isJoining || game.creator_id === user?.id}
                              size="sm"
                              className="min-w-[100px]"
                            >
                              {isJoining ? "Joining..." : game.creator_id === user?.id ? "Your Game" : "Join"}
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
        multiSelect={true}
        selectedItems={selectedItems.map((si) => si.item.id)}
      />

      <JoinCoinflipDialog
        open={joinDialogOpen}
        onOpenChange={setJoinDialogOpen}
        game={gameToJoin}
        onJoin={joinGame}
        isJoining={isJoining}
      />
      
      <div className="h-20 md:hidden" />
    </div>
  );
};

export default Coinflip;
