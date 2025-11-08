import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Package, Snowflake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ProfileDropdown } from "@/components/ProfileDropdown";
import { UserInventoryDialog } from "@/components/UserInventoryDialog";
import { SoundToggle } from "@/components/SoundToggle";
import { supabase } from "@/integrations/supabase/client";
import logoImage from "@/assets/logo.png";

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
          {/* Christmas Logo with Effects */}
          <div className="relative group cursor-pointer" onClick={() => navigate("/")}>
            <div className="absolute -inset-2 bg-gradient-to-r from-blue-500/20 via-white/10 to-blue-500/20 rounded-lg blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative">
              <img src={logoImage} alt="Logo" className="h-10 w-10 relative z-10" />
              <Snowflake className="absolute -top-1 -right-1 w-4 h-4 text-blue-400 animate-spin" style={{ animationDuration: "8s" }} />
              <Snowflake className="absolute -bottom-1 -left-1 w-3 h-3 text-white/60 animate-spin" style={{ animationDuration: "12s" }} />
            </div>
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
              <SoundToggle />
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
              className={`h-full transition-all duration-500 ${
                profile.level >= 76 ? 'bg-gradient-to-r from-purple-500 to-violet-500' :
                profile.level >= 51 ? 'bg-gradient-to-r from-blue-500 to-cyan-500' :
                profile.level >= 26 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                'bg-gradient-to-r from-yellow-500 to-orange-500'
              }`}
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
