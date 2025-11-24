import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useMemecoins, Memecoin } from "@/hooks/useMemecoins";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Search } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function Trading() {
  const { memecoins, loading, error } = useMemecoins();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCoin, setSelectedCoin] = useState<Memecoin | null>(null);
  const [tradeAmount, setTradeAmount] = useState("");
  const [portfolio, setPortfolio] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchPortfolio();
  }, [user, navigate]);

  const fetchPortfolio = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('paper_portfolios')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching portfolio:', error);
      return;
    }

    if (!data) {
      // Create default portfolio
      const { data: newPortfolio } = await supabase
        .from('paper_portfolios')
        .insert({
          user_id: user.id,
          name: 'Main Portfolio',
          balance: 10000,
          total_value: 10000,
        })
        .select()
        .single();
      
      setPortfolio(newPortfolio);
    } else {
      setPortfolio(data);
    }
  };

  const handleTrade = async (type: 'buy' | 'sell') => {
    if (!selectedCoin || !tradeAmount || !portfolio) {
      toast.error("Please select a coin and enter amount");
      return;
    }

    const amount = parseFloat(tradeAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const totalValue = amount * selectedCoin.current_price;

    if (type === 'buy' && totalValue > portfolio.balance) {
      toast.error("Insufficient balance");
      return;
    }

    setIsProcessing(true);

    try {
      // Record the trade
      const { error: tradeError } = await supabase
        .from('paper_trades')
        .insert({
          portfolio_id: portfolio.id,
          token_address: selectedCoin.id,
          token_symbol: selectedCoin.symbol.toUpperCase(),
          token_name: selectedCoin.name,
          trade_type: type,
          amount: amount,
          price: selectedCoin.current_price,
          total_value: totalValue,
        });

      if (tradeError) throw tradeError;

      // Update or create position
      const { data: existingPosition } = await supabase
        .from('paper_positions')
        .select('*')
        .eq('portfolio_id', portfolio.id)
        .eq('token_address', selectedCoin.id)
        .single();

      if (type === 'buy') {
        if (existingPosition) {
          const newAmount = Number(existingPosition.amount) + amount;
          const newAvgPrice = 
            ((Number(existingPosition.amount) * Number(existingPosition.average_buy_price)) + totalValue) / newAmount;

          await supabase
            .from('paper_positions')
            .update({
              amount: newAmount,
              average_buy_price: newAvgPrice,
              current_price: selectedCoin.current_price,
            })
            .eq('id', existingPosition.id);
        } else {
          await supabase
            .from('paper_positions')
            .insert({
              portfolio_id: portfolio.id,
              token_address: selectedCoin.id,
              token_symbol: selectedCoin.symbol.toUpperCase(),
              token_name: selectedCoin.name,
              amount: amount,
              average_buy_price: selectedCoin.current_price,
              current_price: selectedCoin.current_price,
            });
        }

        // Update portfolio balance
        await supabase
          .from('paper_portfolios')
          .update({
            balance: Number(portfolio.balance) - totalValue,
          })
          .eq('id', portfolio.id);

        toast.success(`Bought ${amount} ${selectedCoin.symbol.toUpperCase()}`);
      } else {
        // Sell logic
        if (!existingPosition || Number(existingPosition.amount) < amount) {
          toast.error("Insufficient tokens to sell");
          return;
        }

        const newAmount = Number(existingPosition.amount) - amount;
        
        if (newAmount === 0) {
          await supabase
            .from('paper_positions')
            .delete()
            .eq('id', existingPosition.id);
        } else {
          await supabase
            .from('paper_positions')
            .update({ amount: newAmount })
            .eq('id', existingPosition.id);
        }

        // Update portfolio balance
        await supabase
          .from('paper_portfolios')
          .update({
            balance: Number(portfolio.balance) + totalValue,
          })
          .eq('id', portfolio.id);

        toast.success(`Sold ${amount} ${selectedCoin.symbol.toUpperCase()}`);
      }

      setTradeAmount("");
      fetchPortfolio();
    } catch (error) {
      console.error('Trade error:', error);
      toast.error("Trade failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredCoins = memecoins.filter(coin =>
    coin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    coin.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="md:ml-64">
        <TopBar />
        <main className="container mx-auto px-4 py-8 pb-24 md:pb-8">
          <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Memecoin Trading
                </h1>
                <p className="text-muted-foreground">Paper trade memecoins with virtual funds</p>
              </div>
              {portfolio && (
                <Card className="p-4">
                  <p className="text-sm text-muted-foreground">Virtual Balance</p>
                  <p className="text-2xl font-bold text-primary">${parseFloat(portfolio.balance).toFixed(2)}</p>
                </Card>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Coin List */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center gap-2 bg-card p-3 rounded-lg border">
                  <Search className="h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="Search memecoins..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>

                {loading ? (
                  <Card className="p-8 text-center">
                    <p className="text-muted-foreground">Loading memecoins...</p>
                  </Card>
                ) : error ? (
                  <Card className="p-8 text-center">
                    <p className="text-destructive">{error}</p>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {filteredCoins.map((coin) => (
                      <Card
                        key={coin.id}
                        className={`p-4 cursor-pointer transition-all hover:shadow-lg ${
                          selectedCoin?.id === coin.id ? 'ring-2 ring-primary' : ''
                        }`}
                        onClick={() => setSelectedCoin(coin)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <img src={coin.image} alt={coin.name} className="w-10 h-10 rounded-full" />
                            <div>
                              <p className="font-semibold">{coin.name}</p>
                              <p className="text-sm text-muted-foreground uppercase">{coin.symbol}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-lg">${coin.current_price.toFixed(6)}</p>
                            <div className="flex items-center gap-1">
                              {coin.price_change_percentage_24h >= 0 ? (
                                <>
                                  <ArrowUpRight className="w-4 h-4 text-green-500" />
                                  <span className="text-sm text-green-500">
                                    +{coin.price_change_percentage_24h.toFixed(2)}%
                                  </span>
                                </>
                              ) : (
                                <>
                                  <ArrowDownRight className="w-4 h-4 text-red-500" />
                                  <span className="text-sm text-red-500">
                                    {coin.price_change_percentage_24h.toFixed(2)}%
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Trading Panel */}
              <Card className="p-6 h-fit">
                <h2 className="text-xl font-bold mb-4">
                  {selectedCoin ? `Trade ${selectedCoin.symbol.toUpperCase()}` : 'Select a coin'}
                </h2>

                {selectedCoin ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <img src={selectedCoin.image} alt={selectedCoin.name} className="w-8 h-8 rounded-full" />
                        <div>
                          <p className="font-semibold">{selectedCoin.name}</p>
                          <p className="text-sm text-muted-foreground">${selectedCoin.current_price.toFixed(6)}</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm text-muted-foreground">Amount</label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={tradeAmount}
                        onChange={(e) => setTradeAmount(e.target.value)}
                        className="mt-1"
                      />
                      {tradeAmount && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Total: ${(parseFloat(tradeAmount) * selectedCoin.current_price).toFixed(2)}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        onClick={() => handleTrade('buy')}
                        disabled={isProcessing || !tradeAmount}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        {isProcessing ? 'Processing...' : 'Buy'}
                      </Button>
                      <Button
                        onClick={() => handleTrade('sell')}
                        disabled={isProcessing || !tradeAmount}
                        variant="destructive"
                        className="w-full"
                      >
                        {isProcessing ? 'Processing...' : 'Sell'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Select a memecoin to start trading
                  </p>
                )}
              </Card>
            </div>
          </div>
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
