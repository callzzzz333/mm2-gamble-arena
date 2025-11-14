import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { User, LogOut, TrendingUp, Wallet, DollarSign, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getLevelColor, getLevelBgColor, getLevelFillColor } from "@/lib/levelUtils";

interface Profile {
  id: string;
  username: string;
  roblox_username: string | null;
  avatar_url: string | null;
  balance: number;
  total_wagered: number;
  total_deposited: number;
  total_profits: number;
  level: number;
}

export const ProfileDropdown = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchUserProfile();

    // Subscribe to profile updates for real-time stats
    const profileChannel = supabase
      .channel('profile-changes')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'profiles' 
      }, (payload) => {
        if (payload.new.id === user?.id) {
          setProfile(payload.new as Profile);
        }
      })
      .subscribe();

    // Refresh profile every 5 seconds to ensure stats are up to date
    const interval = setInterval(fetchUserProfile, 5000);

    return () => {
      supabase.removeChannel(profileChannel);
      clearInterval(interval);
    };
  }, [user]);

  const fetchUserProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUser(user);
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      
      if (data) {
        setProfile(data);
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Logged out",
      description: "You have been successfully logged out",
    });
    navigate("/auth");
  };

  if (!profile) return null;

  // Calculate progress to next level
  const wageredInCurrentLevel = (profile.total_wagered || 0) % 20;
  const progressPercent = (wageredInCurrentLevel / 20) * 100;
  const remainingToNextLevel = 20 - wageredInCurrentLevel;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="outline-none">
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
            <Avatar className="w-10 h-10 ring-2 ring-primary/30">
              <AvatarImage src={profile.avatar_url || undefined} alt={profile.roblox_username || profile.username} />
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-primary font-bold">
                {(profile.roblox_username || profile.username)[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="text-left hidden lg:block">
              <p className="text-sm font-semibold">{profile.roblox_username || profile.username}</p>
              <p className="text-xs text-muted-foreground">${profile.balance.toFixed(2)}</p>
            </div>
          </div>
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80 p-0">
        <Card className="border-0 shadow-none">
          {/* Profile Header */}
          <div className="p-4 bg-gradient-to-br from-primary/10 to-accent/10 border-b">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16 ring-2 ring-primary/50">
                <AvatarImage src={profile.avatar_url || undefined} alt={profile.roblox_username || profile.username} />
                <AvatarFallback className="bg-gradient-to-br from-primary/30 to-accent/30 text-primary font-bold text-xl">
                  {(profile.roblox_username || profile.username)[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-lg">{profile.roblox_username || profile.username}</p>
                  <div className={`flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r ${getLevelBgColor(profile.level)} rounded-full border`}>
                    <Star className={`w-3 h-3 ${getLevelColor(profile.level)} ${getLevelFillColor(profile.level)}`} />
                    <span className={`text-xs font-bold ${getLevelColor(profile.level)}`}>Lv {profile.level}</span>
                  </div>
                </div>
                {profile.roblox_username && (
                  <p className="text-xs text-muted-foreground">Roblox Verified</p>
                )}
                <div className="flex items-center gap-1 mt-1">
                  <Wallet className="w-4 h-4 text-primary" />
                  <span className="font-bold text-primary">${profile.balance.toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            {/* Level Progress Bar */}
            {profile.level < 99 && (
              <div className="mt-3 px-4 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Level Progress</span>
                  <span className={`${getLevelColor(profile.level)} font-semibold`}>${remainingToNextLevel.toFixed(2)} to Lv {profile.level + 1}</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="p-4 space-y-3">
            <DropdownMenuLabel className="px-0 text-xs text-muted-foreground uppercase">
              Statistics
            </DropdownMenuLabel>
            
            <div className="grid grid-cols-4 gap-2">
              <div className={`text-center p-2 bg-gradient-to-br ${getLevelBgColor(profile.level)} rounded-lg`}>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Star className={`w-3 h-3 ${getLevelColor(profile.level)} ${getLevelFillColor(profile.level)}`} />
                </div>
                <p className="text-xs text-muted-foreground">Level</p>
                <p className={`font-bold text-sm ${getLevelColor(profile.level)}`}>{profile.level}</p>
              </div>
              
              <div className="text-center p-2 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <TrendingUp className="w-3 h-3 text-blue-500" />
                </div>
                <p className="text-xs text-muted-foreground">Wagered</p>
                <p className="font-bold text-sm">${profile.total_wagered?.toFixed(0) || "0"}</p>
              </div>
              
              <div className="text-center p-2 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <DollarSign className="w-3 h-3 text-green-500" />
                </div>
                <p className="text-xs text-muted-foreground">Deposited</p>
                <p className="font-bold text-sm">${profile.total_deposited?.toFixed(0) || "0"}</p>
              </div>
              
              <div className="text-center p-2 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <TrendingUp className="w-3 h-3 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground">Profit</p>
                <p className={`font-bold text-sm ${(profile.total_profits || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  ${profile.total_profits?.toFixed(0) || "0"}
                </p>
              </div>
            </div>
          </div>

          <DropdownMenuSeparator className="my-0" />

          {/* Actions */}
          <div className="p-2">
            <DropdownMenuItem 
              onClick={() => navigate("/deposit")}
              className="cursor-pointer"
            >
              <Wallet className="w-4 h-4 mr-2" />
              Deposit
            </DropdownMenuItem>
            
            <DropdownMenuItem 
              onClick={() => navigate("/withdraw")}
              className="cursor-pointer"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Withdraw
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem 
              onClick={handleLogout}
              className="cursor-pointer text-red-500 focus:text-red-500"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </div>
        </Card>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
