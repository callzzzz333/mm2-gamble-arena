import { useEffect, useState, useMemo, useCallback, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Timer } from "lucide-react";

interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  game_type: string;
  description: string;
  created_at: string;
  game_id?: string;
  profiles: {
    username: string;
    avatar_url: string | null;
    roblox_username: string | null;
  } | null;
  items?: Array<{
    item_id: string;
    name: string;
    value: number;
    quantity: number;
    image_url: string | null;
    rarity: string;
  }> | null;
}

export const LiveBets = memo(() => {
  const [liveBets, setLiveBets] = useState<Transaction[]>([]);

  const fetchLiveBets = useCallback(async () => {
    console.log('Fetching live bets...');
    const { data: txs, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .in('type', ['bet', 'win', 'loss'])
      .not('game_type', 'is', null)
      .order('created_at', { ascending: false })
      .limit(20);

    if (txError) {
      console.error('Error fetching live bets:', txError);
      return;
    }

    // Fetch roulette games
    const { data: rouletteBets } = await supabase
      .from('roulette_bets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    // Fetch crash games  
    const { data: crashBets } = await supabase
      .from('crash_bets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    // Fetch upgrader games
    const { data: upgraderGames } = await supabase
      .from('upgrader_games')
      .select('*')
      .not('won', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(5);

    // Fetch user profiles
    const userIds = Array.from(new Set((txs || []).map(t => t.user_id))).filter(Boolean);
    let profilesMap: Record<string, any> = {};

    if (userIds.length) {
      const { data: profs, error: profErr } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, roblox_username')
        .in('id', userIds as any);
      if (profErr) {
        console.error('Error fetching profiles:', profErr);
      } else {
        profilesMap = Object.fromEntries((profs || []).map(p => [p.id, p]));
      }
    }

    // Fetch coinflip game data to get items
    const coinflipGameIds = (txs || [])
      .filter(t => t.game_type === 'coinflip' && t.game_id)
      .map(t => t.game_id);
    
    let gamesMap: Record<string, any> = {};
    if (coinflipGameIds.length) {
      const { data: games } = await supabase
        .from('coinflip_games')
        .select('id, creator_id, creator_items, joiner_items')
        .in('id', coinflipGameIds as any);
      
      if (games) {
        gamesMap = Object.fromEntries(games.map(g => [g.id, g]));
      }
    }

    // Create synthetic transactions for roulette, crash and upgrader
    const syntheticBets: any[] = [];
    
    if (rouletteBets) {
      for (const bet of rouletteBets) {
        syntheticBets.push({
          id: `roulette-${bet.id}`,
          user_id: bet.user_id,
          amount: Number(bet.bet_amount),
          type: bet.won === null ? 'bet' : bet.won ? 'win' : 'loss',
          game_type: 'roulette',
          description: `Bet on ${bet.bet_color}`,
          created_at: bet.created_at,
          game_id: bet.game_id,
        });
      }
    }

    if (crashBets) {
      for (const bet of crashBets) {
        syntheticBets.push({
          id: `crash-${bet.id}`,
          user_id: bet.user_id,
          amount: Number(bet.bet_amount),
          type: bet.won === null ? 'bet' : bet.won ? 'win' : 'loss',
          game_type: 'crash',
          description: bet.cashed_out ? `Cashed out at ${bet.cashout_at}x` : 'Placed bet',
          created_at: bet.created_at,
          game_id: bet.game_id,
        });
      }
    }

    if (upgraderGames) {
      for (const game of upgraderGames) {
        syntheticBets.push({
          id: `upgrader-${game.id}`,
          user_id: game.user_id,
          amount: 0,
          type: game.won ? 'win' : 'loss',
          game_type: 'upgrader',
          description: game.won ? 'Successful upgrade' : 'Failed upgrade',
          created_at: game.completed_at,
          game_id: game.id,
        });
      }
    }

    const allBets = [...(txs || []), ...syntheticBets];

    const merged = allBets.map((t: any) => {
      const game = gamesMap[t.game_id];
      let items = null;
      
      // Determine which items to show based on who made the bet
      if (game && t.game_type === 'coinflip') {
        if (t.user_id === game.creator_id) {
          items = game.creator_items;
        } else {
          items = game.joiner_items;
        }
      }

      return {
        ...t,
        profiles: profilesMap[t.user_id] || null,
        items: items,
      };
    });

    // Sort by created_at
    merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    console.log('Fetched live bets count:', merged.length);
    setLiveBets(merged.slice(0, 30) as any);
  }, []);

  useEffect(() => {
    fetchLiveBets();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('transactions-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, () => {
        console.log('New transaction detected, refreshing...');
        fetchLiveBets();
      })
      .subscribe();

    // Refresh every 10 seconds
    const interval = setInterval(() => {
      fetchLiveBets();
    }, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [fetchLiveBets]);

  const getGameTypeColor = useCallback((gameType: string) => {
    const colors: any = {
      'coinflip': 'bg-blue-500/20 text-blue-500',
      'jackpot': 'bg-purple-500/20 text-purple-500',
      'roulette': 'bg-red-500/20 text-red-500',
      'crash': 'bg-orange-500/20 text-orange-500',
      'upgrader': 'bg-pink-500/20 text-pink-500',
      'item_duel': 'bg-red-500/20 text-red-500',
      'russian_roulette': 'bg-orange-500/20 text-orange-500',
      'king_of_hill': 'bg-emerald-500/20 text-emerald-500',
      'team_showdown': 'bg-yellow-500/20 text-yellow-500',
      'draft_battle': 'bg-cyan-500/20 text-cyan-500',
    };
    return colors[gameType] || 'bg-gray-500/20 text-gray-500';
  }, []);

  const formatGameType = useCallback((gameType: string) => {
    return gameType?.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Unknown';
  }, []);

  const formatTime = useCallback((timestamp: string) => {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  }, []);

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <span className="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
        Live Activity
      </h2>
      
      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {liveBets.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Timer className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No recent activity</p>
          </div>
        ) : (
          liveBets.map((bet) => (
            <div key={bet.id} className="p-3 bg-muted/30 rounded-lg border border-border hover:border-primary/30 transition-all">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={bet.profiles?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">{(bet.profiles?.roblox_username || bet.profiles?.username || 'U')[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="font-semibold text-sm">{bet.profiles?.roblox_username || bet.profiles?.username || 'Unknown'}</span>
                  <span className="text-xs text-muted-foreground">
                    {bet.type === 'bet' ? 'placed a bet' : bet.type === 'win' ? 'won' : 'lost'}
                  </span>
                </div>
                <Badge className={getGameTypeColor(bet.game_type)}>
                  {formatGameType(bet.game_type)}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  <span className={bet.type === 'win' ? 'text-green-500 font-semibold' : bet.type === 'loss' ? 'text-red-500' : 'text-yellow-500'}>
                    {bet.type === 'win' ? '+' : bet.type === 'bet' ? '' : '-'}${Math.abs(bet.amount).toFixed(2)}
                  </span>
                  {bet.items && bet.items.length > 0 && (
                    <div className="flex items-center gap-0.5 ml-1">
                      {bet.items.slice(0, 3).map((item, idx) => (
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
                      {bet.items.length > 3 && (
                        <span className="text-[9px] text-muted-foreground ml-0.5">
                          +{bet.items.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <span className="text-muted-foreground">{formatTime(bet.created_at)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
});

LiveBets.displayName = 'LiveBets';
