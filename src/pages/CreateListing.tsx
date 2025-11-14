import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { LiveChat } from "@/components/LiveChat";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Package, Plus, Minus, ArrowLeft } from "lucide-react";
import { UserInventoryDialog } from "@/components/UserInventoryDialog";

interface SelectedItem {
  item: {
    id: string;
    name: string;
    rarity: string;
    value: number;
    image_url: string | null;
  };
  quantity: number;
}

export default function CreateListing() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSelectItem = (itemWithQty: any) => {
    const existing = selectedItems.find((si) => si.item.id === itemWithQty.id);
    if (existing) {
      setSelectedItems(
        selectedItems.map((si) =>
          si.item.id === itemWithQty.id ? { ...si, quantity: si.quantity + 1 } : si
        )
      );
    } else {
      const { quantity, ...item } = itemWithQty;
      setSelectedItems([...selectedItems, { item, quantity: 1 }]);
    }
  };

  const removeItem = (itemId: string) => {
    const existing = selectedItems.find((si) => si.item.id === itemId);
    if (existing && existing.quantity > 1) {
      setSelectedItems(
        selectedItems.map((si) =>
          si.item.id === itemId ? { ...si, quantity: si.quantity - 1 } : si
        )
      );
    } else {
      setSelectedItems(selectedItems.filter((si) => si.item.id !== itemId));
    }
  };

  const getTotalValue = () => {
    return selectedItems.reduce((sum, si) => sum + si.item.value * si.quantity, 0);
  };

  const getRarityColor = (rarity: string) => {
    const colors: Record<string, string> = {
      Legendary: "bg-yellow-500",
      Mythical: "bg-purple-500",
      Ancient: "bg-red-500",
      Vintage: "bg-blue-500",
      Godly: "bg-pink-500",
      Unique: "bg-green-500",
      Rare: "bg-cyan-500",
      Uncommon: "bg-gray-400",
      Common: "bg-gray-300",
    };
    return colors[rarity] || "bg-gray-500";
  };

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to create a listing",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for your listing",
        variant: "destructive",
      });
      return;
    }

    if (selectedItems.length === 0) {
      toast({
        title: "No items selected",
        description: "Please select at least one item to list",
        variant: "destructive",
      });
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      toast({
        title: "Invalid price",
        description: "Please enter a valid price",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const itemsData = selectedItems.map((si) => ({
        id: si.item.id,
        name: si.item.name,
        rarity: si.item.rarity,
        value: si.item.value,
        quantity: si.quantity,
      }));

      const { error } = await supabase.from("marketplace_listings").insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        items: itemsData,
        price: priceNum,
        status: "active",
      });

      if (error) throw error;

      toast({
        title: "Listing created!",
        description: "Your items are now listed on the marketplace",
      });

      navigate("/market");
    } catch (error) {
      console.error("Error creating listing:", error);
      toast({
        title: "Error",
        description: "Failed to create listing. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />

        <main className="flex-1 overflow-y-auto p-6 pb-24 lg:pb-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={() => navigate("/market")}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
                  Create Listing
                </h1>
                <p className="text-muted-foreground mt-1">
                  List your items for sale on the marketplace
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateListing} className="space-y-6">
              {/* Listing Details */}
              <Card className="p-6 space-y-4">
                <h2 className="text-xl font-semibold">Listing Details</h2>

                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Godly Knives Bundle"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your listing..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">Price (USD) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    5% marketplace fee will be deducted from your sale
                  </p>
                </div>
              </Card>

              {/* Items Selection */}
              <Card className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Items</h2>
                  <Button type="button" variant="outline" onClick={() => setInventoryOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Items
                  </Button>
                </div>

                {selectedItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No items selected</p>
                    <p className="text-sm">Click "Add Items" to select from your inventory</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedItems.map((si) => (
                      <div
                        key={si.item.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                      >
                        <div className="flex items-center gap-3">
                          {si.item.image_url && (
                            <img
                              src={si.item.image_url}
                              alt={si.item.name}
                              className="w-12 h-12 object-contain rounded"
                            />
                          )}
                          <div>
                            <p className="font-medium">{si.item.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={getRarityColor(si.item.rarity)}>
                                {si.item.rarity}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                ${si.item.value.toFixed(2)} each
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              onClick={() => removeItem(si.item.id)}
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                            <span className="w-8 text-center font-medium">{si.quantity}</span>
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              onClick={() =>
                                setSelectedItems(
                                  selectedItems.map((item) =>
                                    item.item.id === si.item.id
                                      ? { ...item, quantity: item.quantity + 1 }
                                      : item
                                  )
                                )
                              }
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                          <span className="text-sm font-semibold w-20 text-right">
                            ${(si.item.value * si.quantity).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}

                    <div className="flex justify-between items-center pt-3 border-t">
                      <span className="font-semibold">Total Item Value:</span>
                      <span className="text-xl font-bold text-primary">
                        ${getTotalValue().toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </Card>

              {/* Submit */}
              <div className="flex gap-4">
                <Button type="button" variant="outline" onClick={() => navigate("/market")} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" loading={loading} className="flex-1">
                  Create Listing
                </Button>
              </div>
            </form>
          </div>
        </main>
      </div>

      <UserInventoryDialog
        open={inventoryOpen}
        onOpenChange={setInventoryOpen}
        onSelectItem={handleSelectItem}
      />

      <LiveChat />
      <MobileBottomNav />
    </div>
  );
}
