import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { LiveChat } from "@/components/LiveChat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, TrendingUp, Star, Crown, Medal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getLevelColor, getLevelBgColor, getLevelFillColor } from "@/lib/levelUtils";

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
              <Trophy className="w-12 h-12 text-primary" />
              <h1 className="text-5xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-gradient">
                Leaderboard
              </h1>
            </div>
            <p className="text-muted-foreground text-lg">Compete for the top spot • Earn rewards</p>
          </div>

          {/* Leaderboard Card */}
          <Card className="border-2 border-primary/20 shadow-2xl">
            <CardHeader className="bg-gradient-to-r from-primary/10 via-accent/5 to-primary/10 border-b border-primary/20">
              <CardTitle className="flex items-center gap-3 text-2xl">
                <Crown className="w-6 h-6 text-primary" />
                Top 100 Players
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="text-center py-16 text-muted-foreground">
                  <div className="animate-pulse">Loading leaderboard...</div>
                </div>
              ) : topWagered.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Trophy className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg">No players yet</p>
                  <p className="text-sm mt-2">Be the first to join!</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {topWagered.map((profile, index) => (
                    <div
                      key={profile.id}
                      className={`flex items-center gap-5 p-5 hover:bg-secondary/50 transition-all ${
                        index === 0 ? 'bg-gradient-to-r from-yellow-500/10 via-yellow-500/5 to-transparent' :
                        index === 1 ? 'bg-gradient-to-r from-slate-400/10 via-slate-400/5 to-transparent' :
                        index === 2 ? 'bg-gradient-to-r from-orange-700/10 via-orange-700/5 to-transparent' : ''
                      }`}
                    >
                      {/* Position with Medal */}
                      <div className="flex items-center gap-3 min-w-[5rem]">
                        {index === 0 && <Crown className="w-8 h-8 text-yellow-500 animate-pulse" />}
                        {index === 1 && <Trophy className="w-7 h-7 text-slate-400" />}
                        {index === 2 && <Medal className="w-7 h-7 text-orange-700" />}
                        <span className={`text-3xl font-bold ${getMedalColor(index + 1)}`}>
                          #{index + 1}
                        </span>
                      </div>

                      {/* Avatar */}
                      <Avatar className="w-16 h-16 ring-2 ring-primary/30 shadow-lg">
                        <AvatarImage src={profile.avatar_url || undefined} />
                        <AvatarFallback className="bg-gradient-to-br from-primary/30 to-accent/20 text-primary text-xl font-bold">
                          {(profile.roblox_username || profile.username)[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      {/* Name & Level */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-xl mb-2 truncate">
                          {profile.roblox_username || profile.username}
                        </h3>
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r ${getLevelBgColor(profile.level)} rounded-full border shadow-sm`}>
                          <Star className={`w-4 h-4 ${getLevelColor(profile.level)} ${getLevelFillColor(profile.level)}`} />
                          <span className={`text-sm font-bold ${getLevelColor(profile.level)}`}>Level {profile.level}</span>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="text-right">
                        <div className="flex items-center justify-end gap-1 text-muted-foreground text-xs uppercase tracking-wider mb-1">
                          <TrendingUp className="w-3 h-3" />
                          <span>Total Wagered</span>
                        </div>
                        <p className="font-bold text-2xl text-primary">
                          ${profile.total_wagered?.toFixed(2) || "0.00"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Leaderboard;
