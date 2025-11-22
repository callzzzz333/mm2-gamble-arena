import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Activity, DollarSign, Package, Users } from "lucide-react";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface MarketStats {
  game_type: string;
  total_volume: number;
  total_transactions: number;
  average_price: number;
  trending_items: any;
  updated_at: string;
}

interface ActivityItem {
  id: string;
  activity_type: string;
  amount: number;
  created_at: string;
  metadata: any;
}

export default function Analytics() {
  const [stats, setStats] = useState<MarketStats[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [priceHistory, setPriceHistory] = useState<any[]>([]);
  const [selectedGame, setSelectedGame] = useState<string>("all");

  useEffect(() => {
    fetchMarketStats();
    fetchRecentActivity();
    fetchPriceHistory();

    // Set up realtime subscriptions
    const statsChannel = supabase
      .channel('market-stats-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'market_statistics' }, () => {
        fetchMarketStats();
      })
      .subscribe();

    const activityChannel = supabase
      .channel('activity-feed-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_feed' }, (payload) => {
        setActivities(prev => [payload.new as ActivityItem, ...prev].slice(0, 50));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(statsChannel);
      supabase.removeChannel(activityChannel);
    };
  }, []);

  const fetchMarketStats = async () => {
    const { data } = await supabase
      .from('market_statistics')
      .select('*')
      .order('updated_at', { ascending: false });
    if (data) setStats(data);
  };

  const fetchRecentActivity = async () => {
    const { data } = await supabase
      .from('activity_feed')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setActivities(data);
  };

  const fetchPriceHistory = async () => {
    const { data } = await supabase
      .from('price_history')
      .select('*')
      .order('recorded_at', { ascending: false })
      .limit(100);
    if (data) {
      const chartData = data.reverse().map(item => ({
        time: new Date(item.recorded_at).toLocaleTimeString(),
        value: Number(item.value),
        rap: item.rap
      }));
      setPriceHistory(chartData);
    }
  };

  const totalVolume = stats.reduce((acc, s) => acc + Number(s.total_volume), 0);
  const totalTransactions = stats.reduce((acc, s) => acc + s.total_transactions, 0);
  const avgPrice = stats.length > 0 ? totalVolume / Math.max(totalTransactions, 1) : 0;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Market Analytics
          </h1>
          <p className="text-muted-foreground">Real-time market statistics and trends</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Volume</p>
                <p className="text-2xl font-bold">${totalVolume.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-primary opacity-80" />
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Transactions</p>
                <p className="text-2xl font-bold">{totalTransactions.toLocaleString()}</p>
              </div>
              <Activity className="h-8 w-8 text-primary opacity-80" />
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Price</p>
                <p className="text-2xl font-bold">${avgPrice.toFixed(2)}</p>
              </div>
              <Package className="h-8 w-8 text-primary opacity-80" />
            </div>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Games</p>
                <p className="text-2xl font-bold">{stats.length}</p>
              </div>
              <Users className="h-8 w-8 text-primary opacity-80" />
            </div>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="volume" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto">
            <TabsTrigger value="volume">Volume</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="volume" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Price History</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={priceHistory}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Live Activity Feed</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
                    <div className="flex items-center gap-3">
                      <Activity className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-sm font-medium">{activity.activity_type}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {activity.amount && (
                      <span className="text-sm font-semibold">${Number(activity.amount).toFixed(2)}</span>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stats.map((stat) => (
                <Card key={stat.game_type} className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold uppercase">{stat.game_type}</h3>
                      <TrendingUp className="h-5 w-5 text-green-500" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Volume</span>
                        <span className="font-medium">${Number(stat.total_volume).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Transactions</span>
                        <span className="font-medium">{stat.total_transactions}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Avg Price</span>
                        <span className="font-medium">${Number(stat.average_price).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}