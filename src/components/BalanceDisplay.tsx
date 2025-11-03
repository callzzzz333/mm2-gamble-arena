import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Coins } from "lucide-react";

interface UserItem {
  id: string;
  quantity: number;
  items: {
    name: string;
    image_url: string | null;
    rarity: string;
    value: number;
  };
}

export const BalanceDisplay = () => {
  const [userItems, setUserItems] = useState<UserItem[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserItems();
  }, []);

  const fetchUserItems = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("user_items")
      .select(`
        id,
        quantity,
        items (
          name,
          image_url,
          rarity,
          value
        )
      `)
      .eq("user_id", user.id);

    if (!error && data) {
      setUserItems(data as any);
      
      // Calculate total value
      const total = data.reduce((sum: number, item: any) => {
        return sum + (item.items.value * item.quantity);
      }, 0);
      setTotalValue(total);
    }
    
    setLoading(false);
  };

  if (loading) {
    return null;
  }

  return (
    <Card className="bg-card/50 border-border p-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <Coins className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total Balance</p>
          <p className="text-lg font-bold text-foreground">
            ${totalValue.toFixed(2)}
          </p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs text-muted-foreground">Items</p>
          <p className="text-lg font-bold text-foreground">
            {userItems.reduce((sum, item) => sum + item.quantity, 0)}
          </p>
        </div>
      </div>
      
      {userItems.length > 0 && (
        <div className="mt-4 flex gap-2 overflow-x-auto">
          {userItems.slice(0, 5).map((item) => (
            <div
              key={item.id}
              className="flex-shrink-0 w-16 h-16 bg-background rounded-lg border border-border flex items-center justify-center relative"
              title={item.items.name}
            >
              {item.items.image_url ? (
                <img
                  src={item.items.image_url}
                  alt={item.items.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-xs text-center p-1">{item.items.name}</span>
              )}
              {item.quantity > 1 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {item.quantity}
                </span>
              )}
            </div>
          ))}
          {userItems.length > 5 && (
            <div className="flex-shrink-0 w-16 h-16 bg-background rounded-lg border border-border flex items-center justify-center">
              <span className="text-xs text-muted-foreground">+{userItems.length - 5}</span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};
