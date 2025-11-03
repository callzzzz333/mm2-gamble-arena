import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BalanceDisplay } from "@/components/BalanceDisplay";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const TopBar = () => {
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logged out",
      description: "See you next time!",
    });
    navigate("/auth");
  };

  return (
    <div className="fixed top-0 left-16 right-96 h-16 bg-background/95 backdrop-blur-sm border-b border-border z-40 flex items-center justify-between px-12">
      <div className="flex items-center gap-4">
        {user && <BalanceDisplay />}
      </div>
      
      <div className="flex items-center gap-4">
        {user ? (
          <>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full"></span>
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="w-5 h-5" />
            </Button>
          </>
        ) : (
          <Button onClick={() => navigate("/auth")} className="bg-primary hover:bg-primary/90">
            Login
          </Button>
        )}
      </div>
    </div>
  );
};
