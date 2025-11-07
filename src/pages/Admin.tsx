import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { LiveChat } from "@/components/LiveChat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Shield, Check, X } from "lucide-react";

const Admin = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [itemName, setItemName] = useState("");
  const [itemRarity, setItemRarity] = useState("");
  const [itemValue, setItemValue] = useState("");
  const [itemImageUrl, setItemImageUrl] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [creditAmount, setCreditAmount] = useState("");
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminStatus();
    fetchDeposits();
    fetchUsers();
    fetchWithdrawals();
  }, []);

  const checkAdminStatus = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!data) {
      toast({
        title: "Access Denied",
        description: "You don't have admin permissions",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    setIsAdmin(true);
    setLoading(false);
  };

  const fetchDeposits = async () => {
    const { data } = await supabase
      .from("deposits")
      .select(`
        *,
        profiles (username)
      `)
      .order("created_at", { ascending: false });

    if (data) {
      setDeposits(data);
    }
  };

  const handleDepositStatus = async (depositId: string, status: string) => {
    const { error } = await supabase
      .from("deposits")
      .update({ status })
      .eq("id", depositId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update deposit status",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Deposit ${status}`,
      });
      fetchDeposits();
    }
  };

  const handleDepositApproval = async (deposit: any) => {
    if (!deposit.items_deposited || !Array.isArray(deposit.items_deposited)) {
      toast({
        title: "Error",
        description: "No items found in this deposit",
        variant: "destructive",
      });
      return;
    }

    try {
      // Add items to user's inventory
      for (const depositedItem of deposit.items_deposited) {
        // Check if user already has this item
        const { data: existingItem } = await supabase
          .from('user_items')
          .select('*')
          .eq('user_id', deposit.user_id)
          .eq('item_id', depositedItem.id)
          .single();

        if (existingItem) {
          // Update quantity
          await supabase
            .from('user_items')
            .update({ quantity: existingItem.quantity + depositedItem.quantity })
            .eq('id', existingItem.id);
        } else {
          // Insert new item
          await supabase
            .from('user_items')
            .insert({
              user_id: deposit.user_id,
              item_id: depositedItem.id,
              quantity: depositedItem.quantity
            });
        }
      }

      // Update deposit status
      await handleDepositStatus(deposit.id, "approved");
      
      toast({
        title: "Deposit Approved!",
        description: `Added ${deposit.items_deposited.length} items to ${deposit.profiles?.username}'s inventory`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process deposit",
        variant: "destructive",
      });
    }
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, username")
      .order("username");

    if (data) {
      setUsers(data);
    }
  };

  const fetchWithdrawals = async () => {
    const { data } = await supabase
      .from("withdrawals")
      .select(`
        *,
        profiles (username, roblox_username)
      `)
      .order("created_at", { ascending: false });

    if (data) {
      setWithdrawals(data);
    }
  };

  const handleWithdrawalStatus = async (withdrawalId: string, status: string, withdrawal: any) => {
    if (status === "completed") {
      // Deduct items from user's inventory
      try {
        for (const item of withdrawal.items_requested) {
          const { data: userItem } = await supabase
            .from('user_items')
            .select('*')
            .eq('user_id', withdrawal.user_id)
            .eq('item_id', item.item_id || item.id)
            .single();

          if (userItem) {
            const newQuantity = userItem.quantity - item.quantity;
            
            if (newQuantity <= 0) {
              // Remove item completely
              await supabase
                .from('user_items')
                .delete()
                .eq('id', userItem.id);
            } else {
              // Update quantity
              await supabase
                .from('user_items')
                .update({ quantity: newQuantity })
                .eq('id', userItem.id);
            }
          }
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: "Failed to remove items from inventory",
          variant: "destructive",
        });
        return;
      }
    }

    const { error } = await supabase
      .from("withdrawals")
      .update({ status, processed_at: new Date().toISOString() })
      .eq("id", withdrawalId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update withdrawal status",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Withdrawal ${status}`,
      });
      fetchWithdrawals();
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.from("items").insert({
      name: itemName,
      rarity: itemRarity,
      value: parseFloat(itemValue),
      image_url: itemImageUrl || null,
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create item",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Item created successfully",
      });
      setItemName("");
      setItemRarity("");
      setItemValue("");
      setItemImageUrl("");
    }
  };

  const handleCreditUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUser) {
      toast({ title: "Please select a user", variant: "destructive" });
      return;
    }

    const amount = parseFloat(creditAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }

    const { error } = await supabase.rpc('update_user_balance', {
      p_user_id: selectedUser,
      p_amount: amount,
      p_type: 'admin_credit',
      p_description: `Admin credited $${amount.toFixed(2)}`
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to credit user",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Credited $${amount.toFixed(2)} to user`,
      });
      setSelectedUser("");
      setCreditAmount("");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen w-full flex">
      <Sidebar />
      
      <div className="flex-1 ml-64 mr-96">
        <TopBar />
        
        <main className="pt-16 px-12 py-12">
          <div className="flex items-center gap-3 mb-8">
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold">Admin Panel</h1>
          </div>

          <Tabs defaultValue="deposits" className="w-full">
            <TabsList className="bg-card border border-border">
              <TabsTrigger value="deposits">Deposit Requests</TabsTrigger>
              <TabsTrigger value="withdrawals">Withdrawal Requests</TabsTrigger>
              <TabsTrigger value="items">Manage Items</TabsTrigger>
              <TabsTrigger value="users">Manage Users</TabsTrigger>
            </TabsList>

            <TabsContent value="deposits" className="space-y-4">
              {deposits.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">No deposit requests</p>
                </Card>
              ) : (
                deposits.map((deposit) => (
                  <Card key={deposit.id} className="p-6 bg-card border-border">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <p className="font-semibold text-foreground text-lg">
                            {deposit.profiles?.username}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Trader: {deposit.trader_username}
                          </p>
                          <a
                            href={deposit.private_server_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline flex items-center gap-1"
                          >
                            View Private Server
                          </a>
                          <p className="text-xs text-muted-foreground">
                            {new Date(deposit.created_at).toLocaleString()}
                          </p>
                          <span
                            className={`inline-block px-2 py-1 rounded text-xs ${
                              deposit.status === "pending"
                                ? "bg-yellow-500/20 text-yellow-500"
                                : deposit.status === "approved"
                                ? "bg-green-500/20 text-green-500"
                                : "bg-red-500/20 text-red-500"
                            }`}
                          >
                            {deposit.status}
                          </span>
                        </div>

                        {deposit.status === "pending" && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleDepositApproval(deposit)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Check className="w-4 h-4 mr-1" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDepositStatus(deposit.id, "rejected")}
                            >
                              <X className="w-4 h-4 mr-1" /> Reject
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Display deposited items */}
                      {deposit.items_deposited && Array.isArray(deposit.items_deposited) && deposit.items_deposited.length > 0 && (
                        <div className="border-t border-border pt-4">
                          <h3 className="font-semibold mb-3">Deposited Items:</h3>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {deposit.items_deposited.map((item: any, idx: number) => (
                              <div key={idx} className="p-3 bg-background rounded border border-border">
                                <p className="font-semibold text-sm">{item.name}</p>
                                <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                                <p className="text-primary font-bold">${(item.value * item.quantity).toFixed(2)}</p>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 pt-3 border-t border-border">
                            <p className="text-lg font-bold">
                              Total Value: <span className="text-primary">
                                ${deposit.items_deposited.reduce((sum: number, item: any) => sum + (item.value * item.quantity), 0).toFixed(2)}
                              </span>
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="withdrawals" className="space-y-4">
              {withdrawals.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">No withdrawal requests</p>
                </Card>
              ) : (
                withdrawals.map((withdrawal) => (
                  <Card key={withdrawal.id} className="p-6 bg-card border-border">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <p className="font-semibold text-foreground text-lg">
                            {withdrawal.profiles?.roblox_username || withdrawal.profiles?.username}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Trader: {withdrawal.trader_username}
                          </p>
                          <a
                            href={withdrawal.private_server_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline flex items-center gap-1"
                          >
                            View Private Server
                          </a>
                          <p className="text-xs text-muted-foreground">
                            {new Date(withdrawal.created_at).toLocaleString()}
                          </p>
                          <span
                            className={`inline-block px-2 py-1 rounded text-xs ${
                              withdrawal.status === "pending"
                                ? "bg-yellow-500/20 text-yellow-500"
                                : withdrawal.status === "completed"
                                ? "bg-green-500/20 text-green-500"
                                : "bg-red-500/20 text-red-500"
                            }`}
                          >
                            {withdrawal.status}
                          </span>
                        </div>

                        {withdrawal.status === "pending" && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleWithdrawalStatus(withdrawal.id, "completed", withdrawal)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <Check className="w-4 h-4 mr-1" /> Complete
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleWithdrawalStatus(withdrawal.id, "rejected", withdrawal)}
                            >
                              <X className="w-4 h-4 mr-1" /> Reject
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Display requested items */}
                      {withdrawal.items_requested && Array.isArray(withdrawal.items_requested) && withdrawal.items_requested.length > 0 && (
                        <div className="border-t border-border pt-4">
                          <h3 className="font-semibold mb-3">Requested Items:</h3>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {withdrawal.items_requested.map((item: any, idx: number) => (
                              <div key={idx} className="p-3 bg-background rounded border border-border">
                                {item.image_url && (
                                  <img src={item.image_url} alt={item.name} className="w-full h-20 object-cover rounded mb-2" />
                                )}
                                <p className="font-semibold text-sm">{item.name}</p>
                                <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                                <p className="text-primary font-bold">${(item.value * item.quantity).toFixed(2)}</p>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 pt-3 border-t border-border">
                            <p className="text-lg font-bold">
                              Total Value: <span className="text-primary">
                                ${withdrawal.items_requested.reduce((sum: number, item: any) => sum + (item.value * item.quantity), 0).toFixed(2)}
                              </span>
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>

            <TabsContent value="items">
              <Card className="p-6 bg-card border-border">
                <h2 className="text-xl font-bold mb-4">Create New Item</h2>
                <form onSubmit={handleCreateItem} className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold">Item Name</label>
                    <Input
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      placeholder="e.g., Chroma Darkbringer"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold">Rarity</label>
                    <Input
                      value={itemRarity}
                      onChange={(e) => setItemRarity(e.target.value)}
                      placeholder="e.g., Legendary, Godly, Ancient"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold">Value ($)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={itemValue}
                      onChange={(e) => setItemValue(e.target.value)}
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold">Image URL (Optional)</label>
                    <Input
                      type="url"
                      value={itemImageUrl}
                      onChange={(e) => setItemImageUrl(e.target.value)}
                      placeholder="https://..."
                    />
                  </div>

                  <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
                    Create Item
                  </Button>
                </form>
              </Card>
            </TabsContent>

            <TabsContent value="users">
              <Card className="p-6 bg-card border-border">
                <h2 className="text-xl font-bold mb-4">Credit User Balance</h2>
                <form onSubmit={handleCreditUser} className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold">Select User</label>
                    <select
                      value={selectedUser}
                      onChange={(e) => setSelectedUser(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-md"
                      required
                    >
                      <option value="">Choose a user...</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.username}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-semibold">Amount ($)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={creditAmount}
                      onChange={(e) => setCreditAmount(e.target.value)}
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full bg-primary hover:bg-primary/90">
                    Credit User
                  </Button>
                </form>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>

      <LiveChat />
    </div>
  );
};

export default Admin;
