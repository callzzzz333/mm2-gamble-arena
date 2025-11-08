import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ProfileDropdown } from "@/components/ProfileDropdown";
import { UserInventoryDialog } from "@/components/UserInventoryDialog";
import { supabase } from "@/integrations/supabase/client";

export const TopBar = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        fetchProfile(user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    // Refresh profile periodically for level updates
    const interval = setInterval(() => {
      if (user) fetchProfile(user.id);
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, [user?.id]);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("level, total_wagered")
      .eq("id", userId)
      .single();
    
    if (data) {
      setProfile(data);
    }
  };

  // Calculate progress to next level
  const wageredInCurrentLevel = profile ? (profile.total_wagered || 0) % 20 : 0;
  const progressPercent = (wageredInCurrentLevel / 20) * 100;

  return (
    <>
      <div className="fixed top-0 left-64 right-96 bg-background/95 backdrop-blur-sm border-b border-border z-40">
        <div className="h-16 flex items-center justify-between px-12">
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
        
        {/* Level Progress Bar */}
        {user && profile && profile.level < 99 && (
          <div className="h-1 bg-background/50">
            <div 
              className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>

      <UserInventoryDialog 
        open={inventoryOpen}
        onOpenChange={setInventoryOpen}
      />
    </>
  );
};
