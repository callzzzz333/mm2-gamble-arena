import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Heart, TrendingUp, History, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface WatchlistItem {
  id: string;
  item_id: string;
  added_at: string;
  items: {
    name: string;
    value: number;
    image_url: string;
    game_type: string;
  };
}

interface Transaction {
  id: string;
  amount: number;
  type: string;
  created_at: string;
  description: string;
}

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (data) setProfile(data);
  }, [user]);

  const fetchWatchlist = useCallback(async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('user_watchlist')
      .select(`
        *,
        items (
          name,
          value,
          image_url,
          game_type
        )
      `)
      .eq('user_id', user.id)
      .order('added_at', { ascending: false });

    if (data) setWatchlist(data as any);
    setLoading(false);
  }, [user]);

  const fetchTransactions = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) setTransactions(data);
  }, [user]);

  const removeFromWatchlist = useCallback(async (watchlistId: string) => {
    const { error } = await supabase
      .from('user_watchlist')
      .delete()
      .eq('id', watchlistId);

    if (error) {
      toast.error("Failed to remove from watchlist");
    } else {
      toast.success("Removed from watchlist");
    }
  }, []);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    fetchProfile();
    fetchWatchlist();
    fetchTransactions();

    // Set up realtime for watchlist
    const watchlistChannel = supabase
      .channel('user-watchlist-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'user_watchlist', filter: `user_id=eq.${user.id}` },
        () => fetchWatchlist()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(watchlistChannel);
    };
  }, [user, navigate, fetchProfile, fetchWatchlist, fetchTransactions]);

  const totalWatchlistValue = useMemo(
    () => watchlist.reduce((acc, item) => acc + Number(item.items.value), 0),
    [watchlist]
  );

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
        {/* Profile Header */}
        <Card className="p-6 bg-gradient-to-r from-primary/10 to-primary/5">
          <div className="flex items-center gap-6">
            <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-3xl font-bold text-primary">
                {profile.username.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold">{profile.username}</h1>
              {profile.roblox_username && (
                <p className="text-muted-foreground">Roblox: {profile.roblox_username}</p>
              )}
              <div className="flex gap-6 mt-2">
                <div>
                  <p className="text-sm text-muted-foreground">Level</p>
                  <p className="text-xl font-bold">{profile.level}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Balance</p>
                  <p className="text-xl font-bold">${Number(profile.balance).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Wagered</p>
                  <p className="text-xl font-bold">${Number(profile.total_wagered || 0).toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="watchlist" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 lg:w-auto">
            <TabsTrigger value="watchlist" className="gap-2">
              <Heart className="h-4 w-4" />
              Watchlist
            </TabsTrigger>
            <TabsTrigger value="transactions" className="gap-2">
              <History className="h-4 w-4" />
              Transactions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="watchlist" className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold">Your Watchlist</h3>
                  <p className="text-sm text-muted-foreground">
                    Total Value: ${totalWatchlistValue.toFixed(2)}
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Sort by Value
                </Button>
              </div>

              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : watchlist.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Heart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Your watchlist is empty</p>
                  <p className="text-sm">Add items from the items page to track them here</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {watchlist.map((item) => (
                    <Card key={item.id} className="p-4 hover:shadow-lg transition-all">
                      <div className="space-y-3">
                        <img 
                          src={item.items.image_url || '/placeholder.svg'} 
                          alt={item.items.name}
                          className="w-full h-32 object-contain rounded-lg bg-muted"
                        />
                        <div>
                          <h4 className="font-semibold truncate">{item.items.name}</h4>
                          <p className="text-xs text-muted-foreground uppercase">{item.items.game_type}</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold text-primary">
                            ${Number(item.items.value).toFixed(2)}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFromWatchlist(item.id)}
                          >
                            <Heart className="h-4 w-4 fill-primary text-primary" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Transaction History</h3>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {transactions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No transactions yet</p>
                  </div>
                ) : (
                  transactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                      <div>
                        <p className="font-medium capitalize">{tx.type}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(tx.created_at).toLocaleString()}
                        </p>
                        {tx.description && (
                          <p className="text-xs text-muted-foreground">{tx.description}</p>
                        )}
                      </div>
                      <span className={`text-lg font-bold ${Number(tx.amount) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {Number(tx.amount) >= 0 ? '+' : ''}${Number(tx.amount).toFixed(2)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}