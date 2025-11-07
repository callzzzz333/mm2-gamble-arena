import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfileDropdown } from "@/components/ProfileDropdown";
import { UserInventoryDialog } from "@/components/UserInventoryDialog";
import { OnlineCounter } from "@/components/OnlineCounter";
import { supabase } from "@/integrations/supabase/client";

export const TopBar = () => {
  const [user, setUser] = useState<any>(null);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <>
      <div className="fixed top-0 left-64 right-96 h-16 bg-background/95 backdrop-blur-sm border-b border-border z-40 flex items-center justify-between px-12">
        {/* Left Side - Online Counter */}
        <div className="flex items-center">
          <OnlineCounter />
        </div>
        
        {/* Centered Inventory Button */}
        <div className="flex-1 flex justify-center">
          {user && (
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => setInventoryOpen(true)}
              className="gap-2 border-primary/20 hover:border-primary hover:shadow-glow transition-all font-semibold"
            >
              <Package className="w-5 h-5" />
              Inventory
            </Button>
          )}
        </div>
        
        {/* Right Side Actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative border border-border shadow-glow hover:bg-muted/50"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full"></span>
              </Button>
              <ProfileDropdown />
            </>
          ) : (
            <Button 
              onClick={() => navigate("/auth")} 
              className="bg-primary hover:bg-primary/90 shadow-glow"
            >
              Login
            </Button>
          )}
        </div>
      </div>

      <UserInventoryDialog 
        open={inventoryOpen}
        onOpenChange={setInventoryOpen}
      />
    </>
  );
};
