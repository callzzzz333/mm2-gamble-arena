import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { LiveChat } from "@/components/LiveChat";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Trophy, TrendingUp, Target, Award, ArrowLeft, Crown } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface Battle {
  id: string;
  creator_id: string;
  total_value: number;
  mode: string;
  max_players: number;
  rounds: number;
  current_round: number;
  cases: any;
  status: string;
  winner_id: string | null;
  created_at: string;
  completed_at: string | null;
}

interface Participant {
  id: string;
  battle_id: string;
  user_id: string;
  position: number;
  total_value: number;
  items_won: any;
  profiles?: {
    username: string;
    avatar_url: string | null;
  };
}

interface Round {
  id: string;
  battle_id: string;
  round_number: number;
  case_index: number;
  results: any;
  created_at: string;
}

export default function BattleResults() {
  const navigate = useNavigate();
  const { battleId } = useParams<{ battleId: string }>();
  const [battle, setBattle] = useState<Battle | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (battleId) {
      fetchBattleData();
    }
  }, [battleId]);

  const fetchBattleData = async () => {
    setLoading(true);
    try {
      // Fetch battle details
      const { data: battleData, error: battleError } = await supabase
        .from("case_battles")
        .select("*")
        .eq("id", battleId)
        .single();

      if (battleError) throw battleError;
      setBattle(battleData);

      // Fetch participants
      const { data: participantsData, error: participantsError } = await supabase
        .from("case_battle_participants")
        .select("*")
        .eq("battle_id", battleId)
        .order("total_value", { ascending: false });

      if (participantsError) throw participantsError;

      // Fetch profiles for participants
      const participantsWithProfiles = await Promise.all(
        (participantsData || []).map(async (participant) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("username, avatar_url")
            .eq("id", participant.user_id)
            .single();

          return {
            ...participant,
            profiles: profile,
          };
        })
      );

      setParticipants(participantsWithProfiles);

      // Fetch rounds
      const { data: roundsData, error: roundsError } = await supabase
        .from("case_battle_rounds")
        .select("*")
        .eq("battle_id", battleId)
        .order("round_number", { ascending: true });

      if (roundsError) throw roundsError;
      setRounds(roundsData || []);
    } catch (error: any) {
      console.error("Error fetching battle data:", error);
      toast.error("Failed to load battle results");
    } finally {
      setLoading(false);
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case "chroma":
        return "#a855f7";
      case "godly":
        return "#ef4444";
      case "ancient":
        return "#eab308";
      case "legendary":
        return "#c084fc";
      case "vintage":
        return "#60a5fa";
      case "rare":
        return "#4ade80";
      default:
        return "#94a3b8";
    }
  };

  const getRarityBadgeColor = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case "chroma":
        return "from-purple-500 to-pink-500";
      case "godly":
        return "from-red-500 to-orange-500";
      case "ancient":
        return "from-yellow-500 to-amber-500";
      case "legendary":
        return "from-purple-500 to-indigo-500";
      case "vintage":
        return "from-blue-500 to-cyan-500";
      case "rare":
        return "from-green-500 to-emerald-500";
      default:
        return "from-gray-500 to-slate-500";
    }
  };

  // Calculate round-by-round progress
  const getRoundProgressData = () => {
    const progressData: any[] = [];
    
    rounds.forEach((round) => {
      const roundData: any = { round: `Round ${round.round_number}` };
      
      participants.forEach((participant) => {
        const participantResults = round.results.filter(
          (r: any) => r.user_id === participant.user_id
        );
        const roundTotal = participantResults.reduce(
          (sum: number, r: any) => sum + (r.value || 0),
          0
        );
        roundData[participant.profiles?.username || "Unknown"] = roundTotal;
      });
      
      progressData.push(roundData);
    });
    
    return progressData;
  };

  // Calculate cumulative progress
  const getCumulativeProgressData = () => {
    const cumulativeData: any[] = [];
    const totals: Record<string, number> = {};
    
    participants.forEach((p) => {
      totals[p.profiles?.username || "Unknown"] = 0;
    });
    
    rounds.forEach((round) => {
      participants.forEach((participant) => {
        const participantResults = round.results.filter(
          (r: any) => r.user_id === participant.user_id
        );
        const roundTotal = participantResults.reduce(
          (sum: number, r: any) => sum + (r.value || 0),
          0
        );
        totals[participant.profiles?.username || "Unknown"] += roundTotal;
      });
      
      cumulativeData.push({
        round: `Round ${round.round_number}`,
        ...totals,
      });
    });
    
    return cumulativeData;
  };

  // Get rarity distribution for a participant
  const getRarityDistribution = (participant: Participant) => {
    const distribution: Record<string, number> = {};
    const items = Array.isArray(participant.items_won) ? participant.items_won : [];
    
    items.forEach((item: any) => {
      const rarity = item.rarity || "Common";
      distribution[rarity] = (distribution[rarity] || 0) + 1;
    });
    
    return Object.entries(distribution).map(([rarity, count]) => ({
      name: rarity,
      value: count,
      color: getRarityColor(rarity),
    }));
  };

  const CHART_COLORS = ["#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#ef4444"];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading battle results...</p>
        </div>
      </div>
    );
  }

  if (!battle) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center">
        <Card className="p-8 text-center">
          <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">Battle Not Found</h3>
          <p className="text-muted-foreground mb-4">This battle does not exist or has been deleted.</p>
          <Button onClick={() => navigate("/case-battles")}>Back to Battles</Button>
        </Card>
      </div>
    );
  }

  const winner = participants.find((p) => p.user_id === battle.winner_id);
  const roundProgressData = getRoundProgressData();
  const cumulativeProgressData = getCumulativeProgressData();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <TopBar />
      <div className="flex pt-16">
        <Sidebar />
        <main className="flex-1 p-8 ml-64">
          <div className="max-w-7xl mx-auto">
            <Button
              variant="ghost"
              className="mb-6"
              onClick={() => navigate("/case-battles")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Battles
            </Button>

            {/* Winner Banner */}
            {winner && (
              <Card className="p-8 mb-8 bg-gradient-to-r from-primary/20 to-primary/5 border-primary/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <Crown className="w-16 h-16 text-primary animate-pulse" />
                    <div>
                      <h2 className="text-3xl font-bold mb-2">Battle Winner</h2>
                      <div className="flex items-center gap-4">
                        <Avatar className="w-16 h-16 border-2 border-primary">
                          <AvatarImage src={winner.profiles?.avatar_url || undefined} />
                          <AvatarFallback>
                            {winner.profiles?.username?.slice(0, 2).toUpperCase() || "??"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-2xl font-bold">{winner.profiles?.username}</p>
                          <p className="text-muted-foreground">
                            Won ${winner.total_value.toFixed(2)} in total value
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Trophy className="w-24 h-24 text-primary/30" />
                </div>
              </Card>
            )}

            {/* Battle Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Target className="w-5 h-5 text-primary" />
                  <p className="text-sm text-muted-foreground">Battle Mode</p>
                </div>
                <p className="text-2xl font-bold">{battle.mode.toUpperCase()}</p>
              </Card>
              
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <p className="text-sm text-muted-foreground">Total Value</p>
                </div>
                <p className="text-2xl font-bold text-primary">${battle.total_value.toFixed(2)}</p>
              </Card>
              
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Award className="w-5 h-5 text-primary" />
                  <p className="text-sm text-muted-foreground">Rounds</p>
                </div>
                <p className="text-2xl font-bold">{battle.rounds}</p>
              </Card>
              
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Trophy className="w-5 h-5 text-primary" />
                  <p className="text-sm text-muted-foreground">Players</p>
                </div>
                <p className="text-2xl font-bold">{participants.length}</p>
              </Card>
            </div>

            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="rounds">Round by Round</TabsTrigger>
                <TabsTrigger value="items">Items</TabsTrigger>
                <TabsTrigger value="charts">Charts</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <Card className="p-6">
                  <h3 className="text-xl font-bold mb-6">Participants Ranking</h3>
                  <div className="space-y-4">
                    {participants.map((participant, index) => (
                      <div
                        key={participant.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-2xl font-bold text-muted-foreground w-8">
                            #{index + 1}
                          </div>
                          <Avatar className="w-12 h-12 border-2 border-primary">
                            <AvatarImage src={participant.profiles?.avatar_url || undefined} />
                            <AvatarFallback>
                              {participant.profiles?.username?.slice(0, 2).toUpperCase() || "??"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold flex items-center gap-2">
                              {participant.profiles?.username}
                              {participant.user_id === battle.winner_id && (
                                <Crown className="w-4 h-4 text-primary" />
                              )}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {Array.isArray(participant.items_won) ? participant.items_won.length : 0} items won
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary">
                            ${participant.total_value.toFixed(2)}
                          </p>
                          <Progress
                            value={(participant.total_value / battle.total_value) * 100}
                            className="w-32 mt-2"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="text-xl font-bold mb-6">Cumulative Progress</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={cumulativeProgressData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="round" stroke="hsl(var(--foreground))" />
                      <YAxis stroke="hsl(var(--foreground))" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Legend />
                      {participants.map((participant, index) => (
                        <Line
                          key={participant.id}
                          type="monotone"
                          dataKey={participant.profiles?.username || "Unknown"}
                          stroke={CHART_COLORS[index % CHART_COLORS.length]}
                          strokeWidth={3}
                          dot={{ r: 6 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
              </TabsContent>

              {/* Round by Round Tab */}
              <TabsContent value="rounds" className="space-y-6">
                {rounds.map((round) => (
                  <Card key={round.id} className="p-6">
                    <h3 className="text-xl font-bold mb-4">Round {round.round_number}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {participants.map((participant) => {
                        const participantResults = round.results.filter(
                          (r: any) => r.user_id === participant.user_id
                        );
                        const roundTotal = participantResults.reduce(
                          (sum: number, r: any) => sum + (r.value || 0),
                          0
                        );

                        return (
                          <div key={participant.id} className="p-4 border rounded-lg">
                            <div className="flex items-center gap-3 mb-3">
                              <Avatar className="w-10 h-10">
                                <AvatarImage src={participant.profiles?.avatar_url || undefined} />
                                <AvatarFallback>
                                  {participant.profiles?.username?.slice(0, 2).toUpperCase() || "??"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-semibold">{participant.profiles?.username}</p>
                                <p className="text-sm text-primary">${roundTotal.toFixed(2)}</p>
                              </div>
                            </div>
                            <div className="space-y-2">
                              {participantResults.map((result: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between p-2 bg-accent/30 rounded"
                                >
                                  <div className="flex items-center gap-2">
                                    <img
                                      src={result.image_url || "/placeholder.svg"}
                                      alt={result.name}
                                      className="w-8 h-8 object-contain"
                                    />
                                    <span className="text-sm">{result.name}</span>
                                  </div>
                                  <Badge
                                    className={`bg-gradient-to-r ${getRarityBadgeColor(
                                      result.rarity
                                    )}`}
                                  >
                                    ${result.value.toFixed(2)}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                ))}
              </TabsContent>

              {/* Items Tab */}
              <TabsContent value="items" className="space-y-6">
                {participants.map((participant) => {
                  const items = Array.isArray(participant.items_won) ? participant.items_won : [];
                  const sortedItems = [...items].sort((a, b) => b.value - a.value);

                  return (
                    <Card key={participant.id} className="p-6">
                      <div className="flex items-center gap-4 mb-6">
                        <Avatar className="w-12 h-12 border-2 border-primary">
                          <AvatarImage src={participant.profiles?.avatar_url || undefined} />
                          <AvatarFallback>
                            {participant.profiles?.username?.slice(0, 2).toUpperCase() || "??"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="text-xl font-bold">{participant.profiles?.username}</h3>
                          <p className="text-sm text-muted-foreground">
                            {items.length} items - ${participant.total_value.toFixed(2)} total
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {sortedItems.map((item: any, idx: number) => (
                          <Card key={idx} className="p-3 hover:border-primary/50 transition-colors">
                            <img
                              src={item.image_url || "/placeholder.svg"}
                              alt={item.name}
                              className="w-full aspect-square object-contain mb-2"
                            />
                            <p className="text-xs font-medium text-center truncate">{item.name}</p>
                            <Badge
                              className={`w-full text-xs mt-1 bg-gradient-to-r ${getRarityBadgeColor(
                                item.rarity
                              )}`}
                            >
                              ${item.value.toFixed(2)}
                            </Badge>
                          </Card>
                        ))}
                      </div>
                    </Card>
                  );
                })}
              </TabsContent>

              {/* Charts Tab */}
              <TabsContent value="charts" className="space-y-6">
                <Card className="p-6">
                  <h3 className="text-xl font-bold mb-6">Round Performance</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={roundProgressData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="round" stroke="hsl(var(--foreground))" />
                      <YAxis stroke="hsl(var(--foreground))" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Legend />
                      {participants.map((participant, index) => (
                        <Bar
                          key={participant.id}
                          dataKey={participant.profiles?.username || "Unknown"}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {participants.map((participant) => (
                    <Card key={participant.id} className="p-6">
                      <h3 className="text-lg font-bold mb-4">
                        {participant.profiles?.username} - Rarity Distribution
                      </h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={getRarityDistribution(participant)}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) =>
                              `${name} ${(percent * 100).toFixed(0)}%`
                            }
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {getRarityDistribution(participant).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
        <LiveChat />
      </div>
    </div>
  );
}
