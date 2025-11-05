import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Wallet, Plus, Minus } from "lucide-react";

export const BalanceDisplay = () => {
  const [balance, setBalance] = useState(0);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

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
          <span className="text-xs text-muted-foreground font-medium">$</span>
          <span className="text-lg font-bold text-foreground tabular-nums">
            {balance.toFixed(2)}
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-1.5">
        <Button
          onClick={() => navigate("/deposit")}
          size="sm"
          className="h-8 px-3 bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/20 transition-all shadow-none"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Deposit
        </Button>
        
        <Button
          onClick={() => navigate("/withdraw")}
          size="sm"
          variant="outline"
          className="h-8 px-3 border-border/50 hover:bg-muted/50 transition-all shadow-none"
        >
          <Minus className="w-3.5 h-3.5 mr-1" />
          Withdraw
        </Button>
      </div>
    </div>
  );
};
