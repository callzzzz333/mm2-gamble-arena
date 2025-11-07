import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Trophy, Timer } from "lucide-react";

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
  const [biggestWins, setBiggestWins] = useState<Transaction[]>([]);
  const [luckyWins, setLuckyWins] = useState<Transaction[]>([]);

  useEffect(() => {
    fetchLiveBets();
    fetchBiggestWins();
    fetchLuckyWins();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('transactions-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, () => {
        fetchLiveBets();
        fetchBiggestWins();
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
    const { data } = await supabase
      .from('transactions')
      .select(`
        *,
        profiles!transactions_user_id_fkey(username, avatar_url, roblox_username)
      `)
      .in('type', ['bet', 'win', 'loss'])
      .not('game_type', 'is', null)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) {
      setLiveBets(data as any);
    }
  };

  const fetchBiggestWins = async () => {
    const { data } = await supabase
      .from('transactions')
      .select(`
        *,
        profiles!transactions_user_id_fkey(username, avatar_url, roblox_username)
      `)
      .eq('type', 'win')
      .not('game_type', 'is', null)
      .order('amount', { ascending: false })
      .limit(10);

    if (data) {
      setBiggestWins(data as any);
    }
  };

  const fetchLuckyWins = async () => {
    // Lucky wins are wins where the amount is significantly higher than average
    const { data } = await supabase
      .from('transactions')
      .select(`
        *,
        profiles!transactions_user_id_fkey(username, avatar_url, roblox_username)
      `)
      .eq('type', 'win')
      .not('game_type', 'is', null)
      .gte('amount', 50) // Only show wins over $50
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      setLuckyWins(data as any);
    }
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
      
      <Tabs defaultValue="live" className="w-full">
        <TabsList className="bg-secondary w-full">
          <TabsTrigger value="live" className="flex-1">Live Bets</TabsTrigger>
          <TabsTrigger value="biggest" className="flex-1">Biggest</TabsTrigger>
          <TabsTrigger value="luckiest" className="flex-1">Luckiest</TabsTrigger>
        </TabsList>
        
        <TabsContent value="live" className="mt-4">
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
                    </div>
                    <Badge className={getGameTypeColor(bet.game_type)}>
                      {formatGameType(bet.game_type)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className={bet.type === 'win' ? 'text-green-500' : bet.type === 'loss' ? 'text-red-500' : 'text-muted-foreground'}>
                      {bet.type === 'win' ? '+' : bet.type === 'loss' ? '-' : ''}${Math.abs(bet.amount).toFixed(2)}
                    </span>
                    <span className="text-muted-foreground">{formatTime(bet.created_at)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="biggest" className="mt-4">
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {biggestWins.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Trophy className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No wins yet</p>
              </div>
            ) : (
              biggestWins.map((win, index) => (
                <div key={win.id} className="p-3 bg-muted/30 rounded-lg border border-border hover:border-primary/30 transition-all">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {index < 3 && (
                        <span className={`text-lg ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : 'text-orange-600'}`}>
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                        </span>
                      )}
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={win.profiles?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">{(win.profiles?.roblox_username || win.profiles?.username || 'U')[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="font-semibold text-sm">{win.profiles?.roblox_username || win.profiles?.username || 'Unknown'}</span>
                    </div>
                    <Badge className={getGameTypeColor(win.game_type)}>
                      {formatGameType(win.game_type)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-green-500 font-bold">+${win.amount.toFixed(2)}</span>
                    <span className="text-muted-foreground">{formatTime(win.created_at)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="luckiest" className="mt-4">
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {luckyWins.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No lucky wins yet</p>
              </div>
            ) : (
              luckyWins.map((win) => (
                <div key={win.id} className="p-3 bg-muted/30 rounded-lg border border-border hover:border-primary/30 transition-all">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span>🍀</span>
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={win.profiles?.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">{(win.profiles?.roblox_username || win.profiles?.username || 'U')[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="font-semibold text-sm">{win.profiles?.roblox_username || win.profiles?.username || 'Unknown'}</span>
                    </div>
                    <Badge className={getGameTypeColor(win.game_type)}>
                      {formatGameType(win.game_type)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-green-500 font-bold">+${win.amount.toFixed(2)}</span>
                    <span className="text-muted-foreground">{formatTime(win.created_at)}</span>
                  </div>
                  {win.description && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">{win.description}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
