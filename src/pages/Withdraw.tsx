import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { LiveChat } from "@/components/LiveChat";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, Clock, CheckCircle, XCircle, Send } from "lucide-react";

interface Withdrawal {
  id: string;
  amount: number;
  trader_username: string;
  status: string;
  created_at: string;
}

export default function Withdraw() {
  const [amount, setAmount] = useState("");
  const [traderUsername, setTraderUsername] = useState("");
  const [privateServerLink, setPrivateServerLink] = useState("");
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchUserData();
    fetchWithdrawals();
  }, []);

  const fetchUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("balance")
      .eq("id", user.id)
      .single();

    if (data) {
      setBalance(parseFloat(String(data.balance)));
    }
  };

  const fetchWithdrawals = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("withdrawals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (data) {
      setWithdrawals(data);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const withdrawAmount = parseFloat(amount);
    
    if (!amount || withdrawAmount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid withdrawal amount",
        variant: "destructive",
      });
      return;
    }

    if (withdrawAmount < 1) {
      toast({
        title: "Minimum withdrawal",
        description: "Minimum withdrawal amount is $1.00",
        variant: "destructive",
      });
      return;
    }

    if (withdrawAmount > balance) {
      toast({
        title: "Insufficient balance",
        description: "You don't have enough balance to withdraw this amount",
        variant: "destructive",
      });
      return;
    }

    if (!traderUsername || !privateServerLink) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Not authenticated",
        description: "Please login to withdraw",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Deduct balance
    const { error: balanceError } = await supabase.rpc("update_user_balance", {
      p_user_id: user.id,
      p_amount: -withdrawAmount,
      p_type: "withdrawal",
      p_description: `Withdrawal request for $${withdrawAmount}`,
    });

    if (balanceError) {
      toast({
        title: "Error",
        description: "Failed to process withdrawal. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Create withdrawal request
    const { error } = await supabase.from("withdrawals").insert({
      user_id: user.id,
      amount: withdrawAmount,
      trader_username: traderUsername,
      private_server_link: privateServerLink,
      status: "pending",
    });

    setLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create withdrawal request",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Withdrawal requested",
        description: "Your withdrawal request has been submitted",
      });
      setAmount("");
      setTraderUsername("");
      setPrivateServerLink("");
      fetchUserData();
      fetchWithdrawals();
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "rejected":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="ml-64">
        <TopBar />
        <main className="p-8">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
                Withdraw Funds
              </h1>
              <p className="text-muted-foreground">
                Convert your balance to MM2 items
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Withdrawal Form */}
              <Card className="p-6 bg-gradient-card border border-border shadow-card">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                    <DollarSign className="w-6 h-6 text-primary" />
                    Request Withdrawal
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Available Balance: <span className="text-primary font-bold">${balance.toFixed(2)}</span>
                  </p>
                </div>

                <form onSubmit={handleWithdraw} className="space-y-4">
                  <div>
                    <Label htmlFor="amount">Amount (USD)</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="1"
                      max={balance}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Enter amount"
                      className="bg-background border-border"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="username">Roblox Trader Username</Label>
                    <Input
                      id="username"
                      type="text"
                      value={traderUsername}
                      onChange={(e) => setTraderUsername(e.target.value)}
                      placeholder="YourRobloxUsername"
                      className="bg-background border-border"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="server">Private Server Link</Label>
                    <Input
                      id="server"
                      type="url"
                      value={privateServerLink}
                      onChange={(e) => setPrivateServerLink(e.target.value)}
                      placeholder="https://www.roblox.com/games/..."
                      className="bg-background border-border"
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Create a private server for MM2 and paste the link here
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-button"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {loading ? "Processing..." : "Submit Withdrawal"}
                  </Button>
                </form>
              </Card>

              {/* Withdrawal History */}
              <Card className="p-6 bg-gradient-card border border-border shadow-card">
                <h2 className="text-2xl font-bold mb-4">Withdrawal History</h2>
                
                <div className="space-y-3">
                  {withdrawals.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No withdrawals yet
                    </p>
                  ) : (
                    withdrawals.map((withdrawal) => (
                      <div
                        key={withdrawal.id}
                        className="p-4 bg-background rounded-lg border border-border"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-lg font-bold text-primary">
                            ${parseFloat(String(withdrawal.amount)).toFixed(2)}
                          </span>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(withdrawal.status)}
                            <span className="text-sm capitalize">{withdrawal.status}</span>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <p>Username: {withdrawal.trader_username}</p>
                          <p>
                            {new Date(withdrawal.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          </div>
        </main>
      </div>
      <LiveChat />
    </div>
  );
}
