import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Gift, Plus, Minus } from "lucide-react";

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

interface CreateGiveawayDialogProps {
  trigger: React.ReactNode;
}

export const CreateGiveawayDialog = ({ trigger }: CreateGiveawayDialogProps) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(5);
  const [userItems, setUserItems] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
      fetchUserItems(session.user.id);
    }
  };

  const fetchUserItems = async (userId: string) => {
    const { data } = await supabase
      .from("user_items")
      .select("*, items(*)")
      .eq("user_id", userId)
      .gt("quantity", 0);

    if (data) {
      setUserItems(data);
    }
  };

  const addItem = (item: any) => {
    const userItem = userItems.find((ui) => ui.item_id === item.id);
    if (!userItem) return;

    const existing = selectedItems.find((si) => si.item.id === item.id);
    if (existing) {
      if (existing.quantity < userItem.quantity) {
        setSelectedItems(
          selectedItems.map((si) => (si.item.id === item.id ? { ...si, quantity: si.quantity + 1 } : si))
        );
      }
    } else {
      setSelectedItems([...selectedItems, { item, quantity: 1 }]);
    }
  };

  const removeItem = (itemId: string) => {
    const existing = selectedItems.find((si) => si.item.id === itemId);
    if (existing && existing.quantity > 1) {
      setSelectedItems(selectedItems.map((si) => (si.item.id === itemId ? { ...si, quantity: si.quantity - 1 } : si)));
    } else {
      setSelectedItems(selectedItems.filter((si) => si.item.id !== itemId));
    }
  };

  const createGiveaway = async () => {
    if (!user || selectedItems.length === 0) {
      toast({ title: "Please select items", variant: "destructive" });
      return;
    }

    const itemsData = selectedItems.map((si) => ({
      item_id: si.item.id,
      name: si.item.name,
      value: si.item.value,
      quantity: si.quantity,
      image_url: si.item.image_url,
      rarity: si.item.rarity,
    }));

    try {
      const { error } = await supabase.functions.invoke("giveaway-create", {
        body: {
          items: itemsData,
          title: title || "Item Giveaway",
          description: description || null,
          durationMinutes,
        },
      });

      if (error) throw error;

      toast({ title: "Giveaway created! 🎉", description: "Users can now join" });
      setOpen(false);
      setTitle("");
      setDescription("");
      setSelectedItems([]);
      setDurationMinutes(5);
      fetchUserItems(user.id);
    } catch (error: any) {
      toast({ title: error.message || "Failed to create giveaway", variant: "destructive" });
    }
  };

  const getRarityColor = (rarity: string) => {
    const colors: any = {
      Godly: "bg-red-500/20 text-red-500",
      Ancient: "bg-purple-500/20 text-purple-500",
      Legendary: "bg-orange-500/20 text-orange-500",
      Rare: "bg-blue-500/20 text-blue-500",
      Uncommon: "bg-green-500/20 text-green-500",
      Common: "bg-gray-500/20 text-gray-500",
    };
    return colors[rarity] || "bg-gray-500/20 text-gray-500";
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Gift className="w-6 h-6 text-primary" />
            Create Giveaway
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter giveaway title"
              maxLength={100}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Description (optional)</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description"
              maxLength={200}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Duration (minutes)</label>
            <Input
              type="number"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Math.max(1, parseInt(e.target.value) || 5))}
              min={1}
              max={60}
            />
          </div>

          {/* Selected Items */}
          {selectedItems.length > 0 && (
            <div>
              <label className="text-sm font-medium mb-2 block">Selected Items</label>
              <div className="space-y-2">
                {selectedItems.map((si) => (
                  <div key={si.item.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    {si.item.image_url && (
                      <img src={si.item.image_url} alt={si.item.name} className="w-12 h-12 object-cover rounded" />
                    )}
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{si.item.name}</p>
                      <Badge className={getRarityColor(si.item.rarity)}>{si.item.rarity}</Badge>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">x{si.quantity}</span>
                      <Button size="sm" variant="ghost" onClick={() => removeItem(si.item.id)}>
                        <Minus className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Available Items */}
          <div>
            <label className="text-sm font-medium mb-2 block">Your Items</label>
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {userItems.map((ui) => (
                <div
                  key={ui.id}
                  onClick={() => addItem(ui.items)}
                  className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  {ui.items?.image_url && (
                    <img src={ui.items.image_url} alt={ui.items.name} className="w-10 h-10 object-cover rounded" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-xs truncate">{ui.items?.name}</p>
                    <div className="flex items-center gap-1">
                      <Badge className={`${getRarityColor(ui.items?.rarity)} text-[10px] px-1 py-0`}>
                        {ui.items?.rarity}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">x{ui.quantity}</span>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" className="h-6 w-6">
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <Button onClick={createGiveaway} className="w-full" disabled={selectedItems.length === 0}>
            Create Giveaway
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
