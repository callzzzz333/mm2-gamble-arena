import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Wallet } from "lucide-react";

export const BalanceDisplay = () => {
  const [balance, setBalance] = useState(0);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetchBalance();
    const cleanup = subscribeToBalanceChanges();
    return cleanup;
  }, []);

  const fetchBalance = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUser(user);
      const { data } = await supabase
        .from("profiles")
        .select("balance")
        .eq("id", user.id)
        .single();
      
      if (data) {
        setBalance(parseFloat(String(data.balance)) || 0);
      }
    }
  };

  const subscribeToBalanceChanges = () => {
    const channel = supabase
      .channel("profile_balance_changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
        },
        async (payload) => {
          const { data: { user } } = await supabase.auth.getUser();
          if (payload.new && user && payload.new.id === user.id) {
            setBalance(parseFloat(String(payload.new.balance)) || 0);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  return (
    <div className="flex items-center gap-2 bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg px-3 py-2 shadow-lg">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-background/80 rounded-md border border-border/30">
        <Wallet className="w-4 h-4 text-primary" />
        <div className="flex items-baseline gap-1">
          <span className="text-xs text-muted-foreground font-medium">Inventory Value: $</span>
          <span className="text-lg font-bold text-foreground tabular-nums">
            {balance.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
};
