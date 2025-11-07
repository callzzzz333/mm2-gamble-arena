import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Package, Check } from "lucide-react";

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

interface UserInventoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectItem?: (item: Item & { quantity: number }) => void;
  multiSelect?: boolean;
  selectedItems?: string[];
}

export const UserInventoryDialog = ({ 
  open, 
  onOpenChange, 
  onSelectItem, 
  multiSelect = false,
  selectedItems = []
}: UserInventoryDialogProps) => {
  const [userItems, setUserItems] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalValue, setTotalValue] = useState(0);

  useEffect(() => {
    if (open) {
      fetchUserItems();
    }
  }, [open]);

  const fetchUserItems = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("user_items")
      .select(`
        id,
        item_id,
        quantity,
        items (
          id,
          name,
          rarity,
          value,
          image_url
        )
      `)
      .eq("user_id", user.id);

    if (data) {
      setUserItems(data as any);
      const total = data.reduce((sum: number, item: any) => 
        sum + (item.items.value * item.quantity), 0
      );
      setTotalValue(total);
    }
    setLoading(false);
  };

  const getRarityColor = (rarity: string) => {
    const colors: Record<string, string> = {
      common: "bg-slate-500",
      uncommon: "bg-green-500",
      rare: "bg-blue-500",
      epic: "bg-purple-500",
      legendary: "bg-yellow-500"
    };
    return colors[rarity.toLowerCase()] || "bg-gray-500";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Package className="w-6 h-6 text-primary" />
            Your Inventory
            <span className="text-primary ml-auto">${totalValue.toFixed(2)}</span>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading inventory...</div>
          ) : userItems.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Your inventory is empty</p>
              <p className="text-sm text-muted-foreground mt-2">Deposit items or win games to get started!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {userItems.map((userItem) => {
                const item = userItem.items;
                const isSelected = selectedItems.includes(item.id);
                
                return (
                  <Card
                    key={userItem.id}
                    className={`p-4 cursor-pointer transition-all hover:shadow-glow hover:border-primary group relative ${
                      isSelected ? "border-primary shadow-glow" : "border-border"
                    }`}
                    onClick={() => onSelectItem?.({ ...item, quantity: userItem.quantity })}
                  >
                    {isSelected && (
                      <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center z-10">
                        <Check className="w-4 h-4 text-primary-foreground" />
                      </div>
                    )}
                    <div className="aspect-square bg-card-hover rounded-lg mb-3 flex items-center justify-center overflow-hidden border border-border relative">
                      {item.image_url ? (
                        <img 
                          src={item.image_url} 
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                        />
                      ) : (
                        <Package className="w-12 h-12 text-muted-foreground" />
                      )}
                      {userItem.quantity > 1 && (
                        <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground">
                          x{userItem.quantity}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="font-semibold text-sm text-foreground truncate">{item.name}</h3>
                      
                      <div className="flex items-center justify-between">
                        <Badge className={`${getRarityColor(item.rarity)} text-white text-xs`}>
                          {item.rarity}
                        </Badge>
                        <span className="text-primary font-bold">${item.value.toFixed(2)}</span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </ScrollArea>
        
        {multiSelect && selectedItems.length > 0 && (
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)} className="w-full">
              Done ({selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected)
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
