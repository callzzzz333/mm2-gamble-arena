import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { LevelCrown } from "@/components/LevelCrown";
import { Trophy, TrendingUp, DollarSign } from "lucide-react";

interface UserProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
}

export const UserProfileDialog = ({ open, onOpenChange, userId }: UserProfileDialogProps) => {
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && userId) {
      fetchProfile();
    }
  }, [open, userId]);

  const fetchProfile = async () => {
    if (!userId) return;

    setLoading(true);
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    const { data: transactions } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (profileData) {
      setProfile(profileData);
      
      const wins = transactions?.filter((t) => t.type === "win").length || 0;
      const losses = transactions?.filter((t) => t.type === "loss").length || 0;
      const totalGames = wins + losses;
      const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 0;

      setStats({
        totalGames,
        wins,
        losses,
        winRate,
      });
    }

    setLoading(false);
  };

  if (!profile) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>User Profile</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Loading...</div>
        ) : (
          <div className="space-y-4">
            {/* Profile Header */}
            <div className="flex items-center gap-4">
              <Avatar className="w-20 h-20">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="text-2xl bg-primary/20 text-primary font-bold">
                  {(profile.roblox_username || profile.username || "U")[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold">{profile.roblox_username || profile.username}</h3>
                  <LevelCrown level={profile.level} size="md" />
                </div>
                <p className="text-sm text-muted-foreground">Level {profile.level}</p>
              </div>
            </div>

            {/* Balance */}
            <Card className="p-4 bg-gradient-to-br from-primary/20 to-accent/20 border-primary/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                  <span className="font-semibold">Balance</span>
                </div>
                <p className="text-2xl font-bold text-primary">${Number(profile.balance || 0).toFixed(2)}</p>
              </div>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold text-muted-foreground">Total Games</span>
                </div>
                <p className="text-xl font-bold">{stats?.totalGames || 0}</p>
              </Card>

              <Card className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold text-muted-foreground">Win Rate</span>
                </div>
                <p className="text-xl font-bold">{stats?.winRate?.toFixed(1) || 0}%</p>
              </Card>

              <Card className="p-3">
                <div className="text-xs font-semibold text-muted-foreground mb-2">Total Wagered</div>
                <p className="text-lg font-bold text-primary">${Number(profile.total_wagered || 0).toFixed(2)}</p>
              </Card>

              <Card className="p-3">
                <div className="text-xs font-semibold text-muted-foreground mb-2">Total Profits</div>
                <p className={`text-lg font-bold ${Number(profile.total_profits || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  ${Number(profile.total_profits || 0).toFixed(2)}
                </p>
              </Card>
            </div>

            {/* Game Stats */}
            <div className="flex gap-2 justify-center">
              <Badge className="bg-green-500/20 text-green-500">{stats?.wins || 0} Wins</Badge>
              <Badge className="bg-red-500/20 text-red-500">{stats?.losses || 0} Losses</Badge>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
