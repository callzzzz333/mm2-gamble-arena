import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { LiveChat } from "@/components/LiveChat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { ExternalLink, Plus, Minus, Package, Bitcoin, Wallet } from "lucide-react";

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

const Deposit = () => {
  const [user, setUser] = useState<any>(null);
  const [privateServerLink, setPrivateServerLink] = useState("");
  const [traderUsername, setTraderUsername] = useState("MM2PVP_Trader");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [cryptoAmount, setCryptoAmount] = useState("");
  const [selectedCrypto, setSelectedCrypto] = useState("btc");
  const [cryptoLoading, setCryptoLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        navigate("/auth");
      } else {
        setUser(user);
      }
    })();
    fetchItems();
  }, [navigate]);

  const fetchItems = async () => {
    const { data } = await supabase
      .from("items")
      .select("*")
      .order("value", { ascending: false });
    
    if (data) {
      setItems(data);
    }
  };

  const addItem = (item: Item) => {
    const existing = selectedItems.find(si => si.item.id === item.id);
    if (existing) {
      setSelectedItems(selectedItems.map(si =>
        si.item.id === item.id
          ? { ...si, quantity: si.quantity + 1 }
          : si
      ));
    } else {
      setSelectedItems([...selectedItems, { item, quantity: 1 }]);
    }
  };

  const removeItem = (itemId: string) => {
    const existing = selectedItems.find(si => si.item.id === itemId);
    if (existing && existing.quantity > 1) {
      setSelectedItems(selectedItems.map(si =>
        si.item.id === itemId
          ? { ...si, quantity: si.quantity - 1 }
          : si
      ));
    } else {
      setSelectedItems(selectedItems.filter(si => si.item.id !== itemId));
    }
  };

  const getTotalValue = () => {
    return selectedItems.reduce((sum, si) => sum + (si.item.value * si.quantity), 0);
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedItems.length === 0) {
      toast({
        title: "No items selected",
        description: "Please select at least one item to deposit",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      const itemsData = selectedItems.map(si => ({
        id: si.item.id,
        name: si.item.name,
        value: si.item.value,
        quantity: si.quantity
      }));

      const { error } = await supabase.from("deposits").insert({
        user_id: profile.id,
        private_server_link: privateServerLink,
        trader_username: traderUsername,
        status: "pending",
        items_deposited: itemsData
      });

      if (error) throw error;

      toast({
        title: "Deposit request submitted!",
        description: `Total value: $${getTotalValue().toFixed(2)}. An admin will review shortly.`,
      });

      setPrivateServerLink("");
      setSelectedItems([]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit deposit",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCryptoDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!cryptoAmount || parseFloat(cryptoAmount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid deposit amount",
        variant: "destructive",
      });
      return;
    }

    setCryptoLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-crypto-payment', {
        body: {
          amount: parseFloat(cryptoAmount),
          currency: selectedCrypto,
        },
      });

      if (error) throw error;

      if (data?.payment?.payment_url) {
        window.open(data.payment.payment_url, '_blank');
        toast({
          title: "Payment created!",
          description: "Opening payment page. Your balance will be credited automatically once confirmed.",
        });
        setCryptoAmount("");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create crypto payment",
        variant: "destructive",
      });
    } finally {
      setCryptoLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex">
      <Sidebar />
      
      <div className="flex-1 md:ml-64 md:mr-96">
        <TopBar />
        
        <main className="pt-20 md:pt-16 px-4 md:px-8 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow">
                <Wallet className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-4xl font-bold">Deposit</h1>
                <p className="text-muted-foreground">Add funds to your account</p>
              </div>
            </div>

            <Tabs defaultValue="items" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
                <TabsTrigger value="items" className="gap-2">
                  <Package className="w-4 h-4" />
                  MM2 Items
                </TabsTrigger>
                <TabsTrigger value="crypto" className="gap-2">
                  <Bitcoin className="w-4 h-4" />
                  Crypto
                </TabsTrigger>
              </TabsList>

              <TabsContent value="items" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Item Selection */}
              <div className="lg:col-span-2 space-y-4">
                <Card className="p-6 bg-card border-border">
                  <h2 className="text-xl font-bold mb-4">Select Items to Deposit</h2>
                  
                  <Input
                    placeholder="Search items..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="mb-4"
                  />

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto">
                    {filteredItems.map((item) => (
                      <Card
                        key={item.id}
                        className="p-3 cursor-pointer hover:border-primary/50 transition-all"
                        onClick={() => addItem(item)}
                      >
                        <div className="aspect-square bg-muted rounded-lg flex items-center justify-center mb-2">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            <Package className="w-8 h-8 text-muted-foreground" />
                          )}
                        </div>
                        <h3 className="font-semibold text-sm truncate">{item.name}</h3>
                        <p className="text-primary font-bold">${item.value.toFixed(2)}</p>
                        <Badge className="mt-1 text-xs">{item.rarity}</Badge>
                      </Card>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Selected Items & Submission */}
              <div className="space-y-4">
                <Card className="p-6 bg-card border-border">
                  <h2 className="text-xl font-bold mb-4">Selected Items</h2>
                  
                  {selectedItems.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No items selected
                    </p>
                  ) : (
                    <div className="space-y-3 mb-4 max-h-[300px] overflow-y-auto">
                      {selectedItems.map((si) => (
                        <div key={si.item.id} className="flex items-center justify-between gap-2 p-2 bg-background rounded">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{si.item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              ${si.item.value.toFixed(2)} x {si.quantity}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-6 w-6"
                              onClick={() => removeItem(si.item.id)}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-6 text-center text-sm">{si.quantity}</span>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-6 w-6"
                              onClick={() => addItem(si.item)}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="border-t border-border pt-4 mt-4">
                    <div className="flex justify-between items-center text-lg font-bold mb-4">
                      <span>Total Value:</span>
                      <span className="text-primary">${getTotalValue().toFixed(2)}</span>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 bg-card border-border">
                  <h2 className="text-lg font-bold mb-4">Deposit Details</h2>
                  <form onSubmit={handleDeposit} className="space-y-4">
                    <div>
                      <label className="text-sm font-semibold mb-2 block">
                        Private Server Link
                      </label>
                      <Input
                        type="url"
                        value={privateServerLink}
                        onChange={(e) => setPrivateServerLink(e.target.value)}
                        placeholder="https://www.roblox.com/games/..."
                        required
                        className="bg-background"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold mb-2 block">
                        Trader Username
                      </label>
                      <Input
                        type="text"
                        value={traderUsername}
                        className="bg-background"
                        disabled
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Trade to this username
                      </p>
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-primary hover:bg-primary/90 shadow-[0_0_10px_hsl(var(--glow-primary)/0.3)]"
                      disabled={loading || selectedItems.length === 0}
                    >
                      {loading ? "Submitting..." : "Submit Deposit"}
                    </Button>
                  </form>
                </Card>

                <Card className="p-4 bg-card border-border">
                  <h3 className="font-bold text-sm mb-2">How to Deposit</h3>
                  <ol className="space-y-1 text-xs text-muted-foreground">
                    <li>1. Select items you want to deposit</li>
                    <li>2. Enter your private server link</li>
                    <li>3. Trade items to {traderUsername}</li>
                    <li>4. Admin will verify and credit you</li>
                  </ol>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="crypto" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6 bg-card border-border">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                    <Bitcoin className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold">Crypto Deposit</h2>
                </div>

                <form onSubmit={handleCryptoDeposit} className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold mb-2 block">
                      Amount (USD)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="5"
                      value={cryptoAmount}
                      onChange={(e) => setCryptoAmount(e.target.value)}
                      placeholder="Enter amount in USD"
                      required
                      className="bg-background"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Minimum deposit: $5.00
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-semibold mb-2 block">
                      Cryptocurrency
                    </label>
                    <div className="p-4 bg-muted/20 rounded-lg border border-primary text-center">
                      <span className="text-3xl">Ł</span>
                      <div className="text-sm font-medium mt-2">Litecoin (LTC) Only</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Send to: LYY4HmKg88pUvDyY4JGhMb8DnJChAmsaru
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90 shadow-glow"
                    disabled={cryptoLoading}
                  >
                    {cryptoLoading ? "Creating Payment..." : "Create Crypto Payment"}
                  </Button>
                </form>
              </Card>

              <Card className="p-6 bg-card border-border">
                <h3 className="font-bold text-lg mb-4">How it works</h3>
                <ol className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex gap-3">
                    <span className="font-bold text-primary">1.</span>
                    <span>Enter the amount you want to deposit in USD</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-primary">2.</span>
                    <span>Select your preferred cryptocurrency</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-primary">3.</span>
                    <span>Click "Create Crypto Payment" to generate a payment address</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-primary">4.</span>
                    <span>Send the exact crypto amount to the provided address</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-bold text-primary">5.</span>
                    <span>Your balance will be credited automatically after blockchain confirmation</span>
                  </li>
                </ol>

                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    <strong>Note:</strong> Crypto deposits are processed automatically once confirmed on the blockchain. 
                    This usually takes 10-30 minutes depending on network congestion.
                  </p>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
          </div>
        </main>
      </div>

      <LiveChat />
      
      <div className="h-20 md:hidden" />
    </div>
  );
};

export default Deposit;
