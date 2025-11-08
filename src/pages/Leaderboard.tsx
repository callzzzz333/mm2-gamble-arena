import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { LiveChat } from "@/components/LiveChat";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, TrendingUp, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface LeaderboardProfile {
  id: string;
  username: string;
  roblox_username: string | null;
  avatar_url: string | null;
  total_wagered: number;
  level: number;
}

const Leaderboard = () => {
  const [topWagered, setTopWagered] = useState<LeaderboardProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();

    // Subscribe to profile updates for real-time leaderboard
    const channel = supabase
      .channel('leaderboard-changes')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'profiles' 
      }, () => {
        fetchLeaderboard();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLeaderboard = async () => {
    setLoading(true);
    
    const { data } = await supabase
      .from("profiles")
      .select("id, username, roblox_username, avatar_url, total_wagered, level")
      .order("total_wagered", { ascending: false })
      .limit(100);

    if (data) {
      setTopWagered(data);
    }
    
    setLoading(false);
  };

  const getMedalColor = (position: number) => {
    if (position === 1) return "text-yellow-500";
    if (position === 2) return "text-gray-400";
    if (position === 3) return "text-amber-700";
    return "text-muted-foreground";
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <TopBar />
      <LiveChat />
      
      <main className="ml-64 mr-96 pt-24 pb-8 px-12">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-3">
              <Trophy className="w-10 h-10 text-primary" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Leaderboard
              </h1>
            </div>
            <p className="text-muted-foreground">Top players by total wagered</p>
          </div>

          {/* Leaderboard */}
          <Card className="p-6 border-primary/20">
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-12 text-muted-foreground">
                  Loading leaderboard...
                </div>
              ) : topWagered.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No data yet
                </div>
              ) : (
                topWagered.map((profile, index) => (
                  <div
                    key={profile.id}
                    className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors border border-border/50"
                  >
                    {/* Position */}
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-background border border-border">
                      {index < 3 ? (
                        <Trophy className={`w-6 h-6 ${getMedalColor(index + 1)}`} />
                      ) : (
                        <span className="font-bold text-muted-foreground">#{index + 1}</span>
                      )}
                    </div>

                    {/* Avatar */}
                    <Avatar className="w-12 h-12 ring-2 ring-primary/30">
                      <AvatarImage src={profile.avatar_url || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-primary font-bold">
                        {(profile.roblox_username || profile.username)[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    {/* Name & Level */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold truncate">
                          {profile.roblox_username || profile.username}
                        </p>
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-full border border-yellow-500/30">
                          <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                          <span className="text-xs font-bold text-yellow-500">Lv {profile.level}</span>
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-6 text-right">
                      <div>
                        <div className="flex items-center gap-1 text-muted-foreground text-xs mb-1">
                          <TrendingUp className="w-3 h-3" />
                          <span>Total Wagered</span>
                        </div>
                        <p className="font-bold text-lg text-primary">
                          ${profile.total_wagered?.toFixed(0) || "0"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Leaderboard;
