import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, TrendingDown, History, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMemecoins } from "@/hooks/useMemecoins";

export default function Portfolio() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { memecoins } = useMemecoins();
  const [portfolio, setPortfolio] = useState<any>(null);
  const [positions, setPositions] = useState<any[]>([]);
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    fetchPortfolio();
    fetchPositions();
    fetchTrades();
  }, [user, navigate]);

  useEffect(() => {
    if (positions.length > 0 && memecoins.length > 0) {
      updatePositionPrices();
    }
  }, [memecoins]);

  const fetchPortfolio = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('paper_portfolios')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (data) setPortfolio(data);
    setLoading(false);
  };

  const fetchPositions = async () => {
    if (!user) return;

    const { data: portfolioData } = await supabase
      .from('paper_portfolios')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!portfolioData) return;

    const { data } = await supabase
      .from('paper_positions')
      .select('*')
      .eq('portfolio_id', portfolioData.id)
      .order('created_at', { ascending: false });

    if (data) setPositions(data);
  };

  const fetchTrades = async () => {
    if (!user) return;

    const { data: portfolioData } = await supabase
      .from('paper_portfolios')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!portfolioData) return;

    const { data } = await supabase
      .from('paper_trades')
      .select('*')
      .eq('portfolio_id', portfolioData.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) setTrades(data);
  };

  const updatePositionPrices = async () => {
    const updatedPositions = positions.map(position => {
      const coin = memecoins.find(c => c.id === position.token_address);
      if (coin) {
        const currentValue = parseFloat(position.amount) * coin.current_price;
        const costBasis = parseFloat(position.amount) * parseFloat(position.average_buy_price);
        const profitLoss = currentValue - costBasis;
        const profitLossPercentage = (profitLoss / costBasis) * 100;

        return {
          ...position,
          current_price: coin.current_price,
          profit_loss: profitLoss,
          profit_loss_percentage: profitLossPercentage,
        };
      }
      return position;
    });

    setPositions(updatedPositions);
  };

  const totalPositionValue = positions.reduce((acc, pos) => {
    return acc + (parseFloat(pos.amount) * parseFloat(pos.current_price || pos.average_buy_price));
  }, 0);

  const totalProfitLoss = positions.reduce((acc, pos) => acc + parseFloat(pos.profit_loss || 0), 0);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="md:ml-64">
        <TopBar />
        <main className="container mx-auto px-4 py-8 pb-24 md:pb-8">
          <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                My Portfolio
              </h1>
              <p className="text-muted-foreground">Track your paper trading performance</p>
            </div>

            {/* Portfolio Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">Cash Balance</p>
                  <Wallet className="h-5 w-5 text-primary" />
                </div>
                <p className="text-2xl font-bold">${portfolio ? parseFloat(portfolio.balance).toFixed(2) : '0.00'}</p>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">Position Value</p>
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <p className="text-2xl font-bold">${totalPositionValue.toFixed(2)}</p>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">Total Value</p>
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <p className="text-2xl font-bold">
                  ${(parseFloat(portfolio?.balance || 0) + totalPositionValue).toFixed(2)}
                </p>
              </Card>

              <Card className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">Total P&L</p>
                  {totalProfitLoss >= 0 ? (
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-500" />
                  )}
                </div>
                <p className={`text-2xl font-bold ${totalProfitLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {totalProfitLoss >= 0 ? '+' : ''}${totalProfitLoss.toFixed(2)}
                </p>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="positions" className="space-y-4">
              <TabsList>
                <TabsTrigger value="positions">Positions</TabsTrigger>
                <TabsTrigger value="history">Trade History</TabsTrigger>
              </TabsList>

              <TabsContent value="positions" className="space-y-4">
                {loading ? (
                  <Card className="p-8 text-center">
                    <p className="text-muted-foreground">Loading positions...</p>
                  </Card>
                ) : positions.length === 0 ? (
                  <Card className="p-8 text-center">
                    <p className="text-muted-foreground">No open positions</p>
                    <p className="text-sm text-muted-foreground">Start trading to see your positions here</p>
                  </Card>
                ) : (
                  positions.map((position) => (
                    <Card key={position.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-lg">{position.token_name}</p>
                          <p className="text-sm text-muted-foreground">{position.token_symbol}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Amount</p>
                          <p className="font-bold">{parseFloat(position.amount).toFixed(4)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Avg Buy</p>
                          <p className="font-bold">${parseFloat(position.average_buy_price).toFixed(6)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Current</p>
                          <p className="font-bold">${parseFloat(position.current_price || position.average_buy_price).toFixed(6)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">P&L</p>
                          <p className={`font-bold ${parseFloat(position.profit_loss || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {parseFloat(position.profit_loss || 0) >= 0 ? '+' : ''}
                            ${parseFloat(position.profit_loss || 0).toFixed(2)} ({parseFloat(position.profit_loss_percentage || 0).toFixed(2)}%)
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </TabsContent>

              <TabsContent value="history" className="space-y-2">
                {trades.length === 0 ? (
                  <Card className="p-8 text-center">
                    <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No trade history</p>
                  </Card>
                ) : (
                  trades.map((trade) => (
                    <Card key={trade.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`px-2 py-1 rounded text-sm font-semibold ${
                            trade.trade_type === 'buy' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                          }`}>
                            {trade.trade_type.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold">{trade.token_name}</p>
                            <p className="text-sm text-muted-foreground">{trade.token_symbol}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{parseFloat(trade.amount).toFixed(4)} @ ${parseFloat(trade.price).toFixed(6)}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(trade.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">${parseFloat(trade.total_value).toFixed(2)}</p>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
