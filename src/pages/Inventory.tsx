import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { LiveChat } from "@/components/LiveChat";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Package, Plus, Minus, Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Item {
  id: string;
  name: string;
  rarity: string;
  value: number;
  image_url: string | null;
}

interface UserItem {
  id: string;
  item_id: string;
  quantity: number;
  items: Item;
}

interface Profile {
  id: string;
  username: string;
  roblox_username: string | null;
}

const Inventory = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [userItems, setUserItems] = useState<UserItem[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>("");
  const [selectedItem, setSelectedItem] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [isItemManager, setIsItemManager] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkItemManager();
    fetchItems();
    fetchProfiles();
  }, []);

  useEffect(() => {
    if (selectedProfile) {
      fetchUserItems(selectedProfile);
    }
  }, [selectedProfile]);

  const checkItemManager = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single();

    // Check if user has item_manager or admin role
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const hasPermission = 
      roles?.some(r => r.role === 'item_manager' || r.role === 'admin');

    setIsItemManager(hasPermission);
  };

  const fetchItems = async () => {
    const { data } = await supabase
      .from("items")
      .select("*")
      .order("value", { ascending: false });

    if (data) setItems(data);
  };

  const fetchProfiles = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, roblox_username")
      .order("username");

    if (data) setProfiles(data);
  };

  const fetchUserItems = async (userId: string) => {
    const { data } = await supabase
      .from("user_items")
      .select("*, items(*)")
      .eq("user_id", userId);

    if (data) setUserItems(data as UserItem[]);
  };

  const addItemToInventory = async () => {
    if (!selectedProfile || !selectedItem || quantity <= 0) {
      toast({
        title: "Invalid Input",
        description: "Please select a profile, item, and valid quantity",
        variant: "destructive",
      });
      return;
    }

    // Check if item already exists
    const existingItem = userItems.find(ui => ui.item_id === selectedItem);

    if (existingItem) {
      const { error } = await supabase
        .from("user_items")
        .update({ quantity: existingItem.quantity + quantity })
        .eq("id", existingItem.id);

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
    } else {
      const { error } = await supabase
        .from("user_items")
        .insert({
          user_id: selectedProfile,
          item_id: selectedItem,
          quantity: quantity,
        });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
    }

    toast({
      title: "Success",
      description: "Item added to inventory",
    });

    fetchUserItems(selectedProfile);
    setQuantity(1);
  };

  const removeItemFromInventory = async (userItemId: string, currentQty: number) => {
    if (currentQty > 1) {
      const { error } = await supabase
        .from("user_items")
        .update({ quantity: currentQty - 1 })
        .eq("id", userItemId);

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
    } else {
      const { error } = await supabase
        .from("user_items")
        .delete()
        .eq("id", userItemId);

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
    }

    toast({
      title: "Success",
      description: "Item removed from inventory",
    });

    fetchUserItems(selectedProfile);
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalValue = userItems.reduce(
    (sum, ui) => sum + (ui.items.value * ui.quantity),
    0
  );

  if (!isItemManager) {
    return (
      <div className="min-h-screen w-full flex">
        <Sidebar />
        <div className="flex-1 ml-64 mr-96">
          <TopBar />
          <main className="pt-16 px-12 py-8">
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">
                You don't have permission to manage inventories
              </p>
            </Card>
          </main>
        </div>
        <LiveChat />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex">
      <Sidebar />
      
      <div className="flex-1 ml-64 mr-96">
        <TopBar />
        
        <main className="pt-16 px-12 py-8">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow">
                <Package className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Inventory Management</h1>
                <p className="text-muted-foreground">Add or remove items from player inventories</p>
              </div>
            </div>

            {/* Add Items Section */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Add Items to Inventory</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Select Player</label>
                  <Select value={selectedProfile} onValueChange={setSelectedProfile}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose player..." />
                    </SelectTrigger>
                    <SelectContent>
                      {profiles.map((profile) => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.username} {profile.roblox_username && `(${profile.roblox_username})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Select Item</label>
                  <Select value={selectedItem} onValueChange={setSelectedItem}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose item..." />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredItems.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name} - ${item.value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Quantity</label>
                  <Input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  />
                </div>

                <div className="flex items-end">
                  <Button onClick={addItemToInventory} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>
                </div>
              </div>

              <div className="mt-4">
                <label className="text-sm font-medium mb-2 block">Search Items</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </Card>

            {/* Current Inventory */}
            {selectedProfile && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Current Inventory</h2>
                  <div className="text-lg font-bold text-primary">
                    Total Value: ${totalValue.toFixed(2)}
                  </div>
                </div>

                {userItems.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    This player has no items in their inventory
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                    {userItems.map((userItem) => (
                      <Card key={userItem.id} className="p-2">
                        <div className="space-y-1.5">
                          <div className="aspect-square bg-muted rounded-md flex items-center justify-center relative">
                            {userItem.items.image_url ? (
                              <img 
                                src={userItem.items.image_url} 
                                alt={userItem.items.name} 
                                className="w-full h-full object-cover rounded-md" 
                              />
                            ) : (
                              <Package className="w-8 h-8 text-muted-foreground" />
                            )}
                            <Badge className="absolute top-1 right-1 bg-primary text-white text-xs">
                              x{userItem.quantity}
                            </Badge>
                          </div>
                          
                          <div className="space-y-1">
                            <h3 className="text-xs font-semibold truncate">{userItem.items.name}</h3>
                            <div className="text-sm font-bold">${userItem.items.value.toFixed(2)}</div>
                            
                            <Button
                              onClick={() => removeItemFromInventory(userItem.id, userItem.quantity)}
                              variant="destructive"
                              size="sm"
                              className="w-full h-6 text-xs"
                            >
                              <Minus className="w-3 h-3 mr-1" />
                              Remove
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </Card>
            )}
          </div>
        </main>
      </div>

      <LiveChat />
    </div>
  );
};

export default Inventory;
