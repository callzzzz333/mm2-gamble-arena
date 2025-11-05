import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { LiveChat } from "@/components/LiveChat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import teamShowdownImg from "@/assets/team-showdown.jpg";

interface TeamMember {
  user_id: string;
  bet_amount: number;
  profiles: {
    username: string;
  };
}

export default function TeamShowdown() {
  const navigate = useNavigate();
  const [betAmount, setBetAmount] = useState<string>("");
  const [user, setUser] = useState<any>(null);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [goldTeam, setGoldTeam] = useState<TeamMember[]>([]);
  const [blackTeam, setBlackTeam] = useState<TeamMember[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<"gold" | "black" | null>(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    setUser(user);

    const { data: profile } = await supabase
      .from("profiles")
      .select("balance")
      .eq("id", user.id)
      .single();

    if (profile) {
      setUserBalance(parseFloat(String(profile.balance)));
    }
  };

  const joinTeam = async (team: "gold" | "black") => {
    const amount = parseFloat(betAmount);
    if (!amount || amount <= 0) {
      toast.error("Please enter a valid bet amount");
      return;
    }

    if (amount > userBalance) {
      toast.error("Insufficient balance");
      return;
    }

    const { data, error } = await supabase.rpc("update_user_balance", {
      p_user_id: user.id,
      p_amount: -amount,
      p_type: "bet",
      p_game_type: "team_showdown",
      p_description: `Joined ${team} team`
    });

    if (error || !data) {
      toast.error("Failed to join team");
      return;
    }

    setUserBalance(prev => prev - amount);
    setSelectedTeam(team);
    toast.success(`Joined ${team} team! Waiting for match to start...`);
  };

  const getTeamTotal = (team: TeamMember[]) => {
    return team.reduce((sum, member) => sum + member.bet_amount, 0);
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      
      <div className="flex-1 ml-64 mr-96">
        <TopBar />
        
        <main className="p-8 pt-24">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="relative h-64 rounded-xl overflow-hidden border border-border shadow-glow">
              <img src={teamShowdownImg} alt="Team Showdown" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
              <div className="absolute bottom-4 left-4">
                <h1 className="text-4xl font-bold text-foreground">Team Showdown</h1>
                <p className="text-muted-foreground">Join a team and fight for victory!</p>
              </div>
            </div>

            {!selectedTeam ? (
              <div className="space-y-6">
                <Card className="p-6 border-border shadow-glow">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-foreground">Bet Amount ($)</label>
                      <Input
                        type="number"
                        value={betAmount}
                        onChange={(e) => setBetAmount(e.target.value)}
                        placeholder="Enter bet amount"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </Card>

                <div className="grid grid-cols-2 gap-6">
                  <Card className="p-6 border-primary shadow-glow bg-gradient-to-br from-primary/10 to-transparent">
                    <h2 className="text-2xl font-bold text-primary mb-4">Gold Team</h2>
                    <div className="space-y-2 mb-4">
                      <div className="text-lg font-bold text-foreground">
                        Total Pot: ${getTeamTotal(goldTeam).toFixed(2)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Members: {goldTeam.length}
                      </div>
                    </div>
                    <Button 
                      onClick={() => joinTeam("gold")}
                      className="w-full bg-primary hover:bg-primary/90 border border-primary/20 shadow-glow"
                    >
                      Join Gold Team
                    </Button>
                  </Card>

                  <Card className="p-6 border-border shadow-glow bg-gradient-to-br from-background/50 to-transparent">
                    <h2 className="text-2xl font-bold text-foreground mb-4">Black Team</h2>
                    <div className="space-y-2 mb-4">
                      <div className="text-lg font-bold text-foreground">
                        Total Pot: ${getTeamTotal(blackTeam).toFixed(2)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Members: {blackTeam.length}
                      </div>
                    </div>
                    <Button 
                      onClick={() => joinTeam("black")}
                      className="w-full bg-foreground hover:bg-foreground/90 text-background border border-border shadow-glow"
                    >
                      Join Black Team
                    </Button>
                  </Card>
                </div>

                <Card className="p-4 bg-card/50 border-border">
                  <h3 className="font-bold text-foreground mb-2">How to Play:</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Choose Gold or Black team</li>
                    <li>• Place your bet to join</li>
                    <li>• When both teams have equal players, battle starts</li>
                    <li>• Winning team splits the total pot</li>
                    <li>• 5% house edge</li>
                  </ul>
                </Card>
              </div>
            ) : (
              <Card className="p-6 border-border shadow-glow">
                <div className="text-center space-y-4">
                  <h2 className="text-2xl font-bold text-foreground">
                    You joined the {selectedTeam} team!
                  </h2>
                  <p className="text-muted-foreground">
                    Waiting for more players to join...
                  </p>
                  <div className="text-xl font-bold text-primary">
                    Your Bet: ${betAmount}
                  </div>
                </div>
              </Card>
            )}
          </div>
        </main>
      </div>

      <LiveChat />
    </div>
  );
}
