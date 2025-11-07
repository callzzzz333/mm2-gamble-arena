import { useEffect, useState } from "react";
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
  profiles: {
    username: string;
    avatar_url: string | null;
    roblox_username: string | null;
  };
}

export const LiveBets = () => {
  const [liveBets, setLiveBets] = useState<Transaction[]>([]);

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
  }, []);

  const fetchLiveBets = async () => {
    console.log('Fetching live bets...');
    const { data: txs, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .in('type', ['bet', 'win', 'loss'])
      .not('game_type', 'is', null)
      .order('created_at', { ascending: false })
      .limit(30);

    if (txError) {
      console.error('Error fetching live bets:', txError);
      return;
    }

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

    const merged = (txs || []).map((t: any) => ({
      ...t,
      profiles: profilesMap[t.user_id] || null,
    }));

    console.log('Fetched live bets count:', merged.length);
    setLiveBets(merged as any);
  };

  const getGameTypeColor = (gameType: string) => {
    const colors: any = {
      'coinflip': 'bg-blue-500/20 text-blue-500',
      'jackpot': 'bg-purple-500/20 text-purple-500',
      'item_duel': 'bg-red-500/20 text-red-500',
      'russian_roulette': 'bg-orange-500/20 text-orange-500',
      'king_of_hill': 'bg-green-500/20 text-green-500',
      'team_showdown': 'bg-yellow-500/20 text-yellow-500',
      'draft_battle': 'bg-pink-500/20 text-pink-500',
    };
    return colors[gameType] || 'bg-gray-500/20 text-gray-500';
  };

  const formatGameType = (gameType: string) => {
    return gameType?.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Unknown';
  };

  const formatTime = (timestamp: string) => {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

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
                <span className={bet.type === 'win' ? 'text-green-500 font-semibold' : bet.type === 'loss' ? 'text-red-500' : 'text-yellow-500'}>
                  {bet.type === 'win' ? '+' : bet.type === 'bet' ? '' : '-'}${Math.abs(bet.amount).toFixed(2)}
                </span>
                <span className="text-muted-foreground">{formatTime(bet.created_at)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
