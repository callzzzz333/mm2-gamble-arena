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
import { useAuth } from "@/hooks/useAuth";
import { Trophy, Package, Minus } from "lucide-react";
import { UserInventoryDialog } from "@/components/UserInventoryDialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

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
  winner_id: string | null;
}

interface SpinState {
  isSpinning: boolean;
  currentIndex: number;
  slowDown: boolean;
}

const Jackpot = () => {
  const [currentGame, setCurrentGame] = useState<JackpotGame | null>(null);
  const [entries, setEntries] = useState<JackpotEntry[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const { user } = useAuth();
  const [timeLeft, setTimeLeft] = useState(0);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [spinState, setSpinState] = useState<SpinState>({ isSpinning: false, currentIndex: 0, slowDown: false });
  const [winner, setWinner] = useState<JackpotEntry | null>(null);
  const [spinAudio] = useState(() => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2573/2573-preview.mp3');
    audio.loop = true;
    audio.volume = 0.3;
    return audio;
  });
  const { toast } = useToast();

  useEffect(() => {
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
      const drawTime = new Date(Date.now() + 60000); // 1 minute
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
      setWinner(null);
    } else {
      setCurrentGame(game as any);
      
      const { data: gameEntries } = await supabase
        .from("jackpot_entries")
        .select(`
          *,
          profiles!jackpot_entries_user_id_fkey(username, avatar_url)
        `)
        .eq("game_id", game.id);
      
      setEntries(gameEntries as any || []);
      
      // If game is completed, find winner
      if (game.status === 'completed' && game.winner_id) {
        const winnerEntry = gameEntries?.find((e: any) => e.user_id === game.winner_id);
        setWinner(winnerEntry as any || null);
      }
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

    // Start spinning animation and sound
    setSpinState({ isSpinning: true, currentIndex: 0, slowDown: false });
    spinAudio.play().catch(e => console.log('Audio play failed:', e));
    
    // Update game status to rolling
    await supabase
      .from("jackpot_games")
      .update({ status: 'rolling' })
      .eq("id", currentGame.id);

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
    let winnerIndex = 0;

    for (let i = 0; i < updatedEntries.length; i++) {
      const entry = updatedEntries[i];
      cumulative += entry.win_chance;
      if (random <= cumulative) {
        winnerId = entry.user_id;
        winnerIndex = i;
        break;
      }
    }

    // Animate the spin
    let currentIdx = 0;
    let speed = 50;
    const spinDuration = 3000;
    const startTime = Date.now();

    const spinInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / spinDuration;
      
      // Gradually slow down
      if (progress > 0.7) {
        speed = 50 + (progress - 0.7) * 500;
        setSpinState(prev => ({ ...prev, slowDown: true }));
      }
      
      currentIdx = (currentIdx + 1) % entries.length;
      setSpinState(prev => ({ ...prev, currentIndex: currentIdx }));
      
      if (elapsed >= spinDuration) {
        clearInterval(spinInterval);
        // Stop sound
        spinAudio.pause();
        spinAudio.currentTime = 0;
        // Land on winner
        setSpinState({ isSpinning: false, currentIndex: winnerIndex, slowDown: false });
        completeWinnerSelection(winnerId, updatedEntries, winnerIndex);
      }
    }, speed);
  };

  const completeWinnerSelection = async (winnerId: string, updatedEntries: any[], winnerIndex: number) => {
    if (!currentGame) return;
    
    const totalPot = parseFloat(currentGame.total_pot);

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

    const winnerEntry = entries.find(e => e.user_id === winnerId);
    setWinner(winnerEntry || null);

    if (winnerId === user?.id) {
      toast({ title: "YOU WON THE JACKPOT! 🎉", description: `Won $${(totalPot * 0.95).toFixed(2)} in items!` });
    } else {
      toast({ title: "Winner Selected!", description: `${winnerEntry?.profiles?.username} won the jackpot!` });
    }

    setTimeout(() => {
      fetchCurrentGame();
    }, 5000);
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
      
      <div className="flex-1 md:ml-64 md:mr-96">
        <TopBar />
        
        <main className="pt-20 md:pt-16 px-4 md:px-12 py-8">
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

            {/* Under Development Notice */}
            <Card className="p-12 text-center border-2 border-primary/50">
              <div className="space-y-4">
                <div className="w-20 h-20 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
                  <Trophy className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-3xl font-bold">Under Development</h2>
                <p className="text-lg text-muted-foreground max-w-md mx-auto">
                  The Jackpot game mode is currently being developed and will be available soon.
                  Check back later for exciting jackpot action!
                </p>
              </div>
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
};

export default Jackpot;
