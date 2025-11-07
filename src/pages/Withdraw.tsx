import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { LiveChat } from "@/components/LiveChat";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, Clock, CheckCircle, XCircle, Send, Package, Minus } from "lucide-react";
import { UserInventoryDialog } from "@/components/UserInventoryDialog";

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

interface Withdrawal {
  id: string;
  amount: number;
  trader_username: string;
  status: string;
  created_at: string;
  items_requested: any[];
}

export default function Withdraw() {
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [traderUsername, setTraderUsername] = useState("");
  const [privateServerLink, setPrivateServerLink] = useState("");
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchWithdrawals();
  }, []);

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

  const fetchUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
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
      setWithdrawals(data as any);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedItems.length === 0) {
      toast({
        title: "No items selected",
        description: "Please select items from your inventory",
        variant: "destructive",
      });
      return;
    }

    const withdrawAmount = getTotalValue();
    
    if (withdrawAmount < 1) {
      toast({
        title: "Minimum withdrawal",
        description: "Minimum withdrawal amount is $1.00",
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

    // Verify user still has the items
    for (const si of selectedItems) {
      const { data: userItem, error: checkError } = await supabase
        .from('user_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('item_id', si.item.id)
        .single();

      if (checkError || !userItem || userItem.quantity < si.quantity) {
        toast({ 
          title: `Not enough ${si.item.name}`, 
          description: "Please refresh and try again",
          variant: "destructive" 
        });
        setLoading(false);
        return;
      }
    }

    const itemsData = selectedItems.map(si => ({
      id: si.item.id,
      item_id: si.item.id,
      name: si.item.name,
      value: si.item.value,
      quantity: si.quantity,
      image_url: si.item.image_url,
      rarity: si.item.rarity
    }));

    // Create withdrawal request
    const { error } = await supabase.from("withdrawals").insert({
      user_id: user.id,
      amount: withdrawAmount,
      trader_username: traderUsername,
      private_server_link: privateServerLink,
      items_requested: itemsData,
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
      setSelectedItems([]);
      setTraderUsername("");
      setPrivateServerLink("");
      fetchWithdrawals();
    }
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
                  Withdraw Items
                </h1>
                <p className="text-muted-foreground">
                  Select items from your inventory to withdraw
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
                  </div>

                  <form onSubmit={handleWithdraw} className="space-y-4">
                    <div>
                      <Label>Select Items from Inventory</Label>
                      <Button 
                        type="button"
                        variant="outline" 
                        className="w-full justify-start gap-2 mt-2"
                        onClick={() => setInventoryOpen(true)}
                      >
                        <Package className="w-4 h-4" />
                        {selectedItems.length === 0 ? 'Select from inventory' : `${selectedItems.length} items selected`}
                      </Button>

                      {selectedItems.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {selectedItems.map((si) => (
                            <div key={si.item.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                              {si.item.image_url && (
                                <img src={si.item.image_url} alt={si.item.name} className="w-12 h-12 object-cover rounded" />
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
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeItem(si.item.id)}
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                          <div className="pt-2 border-t border-border">
                            <p className="text-lg font-bold">Total: <span className="text-primary">${getTotalValue().toFixed(2)}</span></p>
                          </div>
                        </div>
                      )}
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
                      disabled={loading || selectedItems.length === 0}
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
                        
                        {/* Display requested items */}
                        {withdrawal.items_requested && Array.isArray(withdrawal.items_requested) && withdrawal.items_requested.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-border">
                            <p className="text-xs text-muted-foreground mb-2">Items ({withdrawal.items_requested.length}):</p>
                            <div className="flex flex-wrap gap-1">
                              {withdrawal.items_requested.map((item: any, idx: number) => (
                                <span key={idx} className="text-xs bg-background px-2 py-1 rounded border border-border">
                                  {item.name} x{item.quantity}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
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
      
      <UserInventoryDialog 
        open={inventoryOpen} 
        onOpenChange={setInventoryOpen}
        onSelectItem={handleSelectItem}
        multiSelect={true}
        selectedItems={selectedItems.map(si => si.item.id)}
      />
    </div>
  );
}
