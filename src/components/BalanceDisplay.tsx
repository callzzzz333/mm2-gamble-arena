import { useEffect, useState } from "react";
import { DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const BalanceDisplay = () => {
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    fetchBalance();

    const channel = supabase
      .channel('balance-changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, async (payload) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && payload.new.id === user.id) {
          setBalance(parseFloat((payload.new as any).balance) || 0);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchBalance = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("balance")
      .eq("id", user.id)
      .single();

    if (data) {
      setBalance(parseFloat(String(data.balance)) || 0);
    }
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-card rounded-lg border border-border">
      <DollarSign className="w-4 h-4 text-primary" />
      <span className="font-semibold">${balance.toFixed(2)}</span>
    </div>
  );
};
