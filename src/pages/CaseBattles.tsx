import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { LiveChat } from "@/components/LiveChat";
import { CaseOpeningAnimation } from "@/components/CaseOpeningAnimation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Swords, Users, Trophy, Play, Eye } from "lucide-react";

interface Item {
  id: string;
  name: string;
  value: number;
  rarity: string;
  image_url: string | null;
}

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

export default function CaseBattles() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [battles, setBattles] = useState<Battle[]>([]);
  const [participants, setParticipants] = useState<Record<string, Participant[]>>({});
  const [items, setItems] = useState<Item[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedMode, setSelectedMode] = useState("1v1");
  const [selectedRounds, setSelectedRounds] = useState(1);
  const [selectedCases, setSelectedCases] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewingBattle, setViewingBattle] = useState<Battle | null>(null);
  const [currentRoundResults, setCurrentRoundResults] = useState<any[]>([]);
  const [showingAnimations, setShowingAnimations] = useState(false);
  const [animationsCompleted, setAnimationsCompleted] = useState(0);

  useEffect(() => {
    checkUser();
    fetchBattles();
    fetchItems();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("case-battles-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "case_battles",
        },
        () => {
          fetchBattles();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "case_battle_participants",
        },
        () => {
          fetchBattles();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "case_battle_rounds",
        },
        () => {
          fetchBattles();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    setUser(user);
  };

  const fetchBattles = async () => {
    const { data, error } = await supabase
      .from("case_battles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching battles:", error);
      return;
    }

    setBattles(data || []);

    // Fetch participants for each battle
    for (const battle of data || []) {
      fetchParticipants(battle.id);
    }
  };

  const fetchParticipants = async (battleId: string) => {
    const { data, error } = await supabase
      .from("case_battle_participants")
      .select("*")
      .eq("battle_id", battleId)
      .order("position", { ascending: true });

    if (error) {
      console.error("Error fetching participants:", error);
      return;
    }

    // Fetch profiles for each participant
    const participantsWithProfiles = await Promise.all(
      (data || []).map(async (participant) => {
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

    setParticipants((prev) => ({
      ...prev,
      [battleId]: participantsWithProfiles,
    }));
  };

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from("items")
      .select("*")
      .order("value", { ascending: false });

    if (error) {
      console.error("Error fetching items:", error);
      return;
    }

    setItems(data || []);
  };

  const handleCreateBattle = async () => {
    if (!user) return;
    if (selectedCases.length === 0) {
      toast.error("Please select at least one case");
      return;
    }

    setLoading(true);

    try {
      const maxPlayers = selectedMode === "1v1" ? 2 : selectedMode === "1v1v1" ? 3 : 4;
      const totalValue = selectedCases.length * selectedRounds * 10; // Placeholder calculation

      const { data: battle, error: battleError } = await supabase
        .from("case_battles")
        .insert({
          creator_id: user.id,
          total_value: totalValue,
          mode: selectedMode,
          max_players: maxPlayers,
          rounds: selectedRounds,
          cases: selectedCases,
        })
        .select()
        .single();

      if (battleError) throw battleError;

      // Add creator as first participant
      const { error: participantError } = await supabase
        .from("case_battle_participants")
        .insert({
          battle_id: battle.id,
          user_id: user.id,
          position: 1,
        });

      if (participantError) throw participantError;

      toast.success("Battle created successfully!");
      setShowCreateDialog(false);
      setSelectedCases([]);
      fetchBattles();
    } catch (error: any) {
      console.error("Error creating battle:", error);
      toast.error("Failed to create battle");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinBattle = async (battleId: string, battle: Battle) => {
    if (!user) return;

    setLoading(true);

    try {
      const battleParticipants = participants[battleId] || [];
      const nextPosition = battleParticipants.length + 1;

      if (nextPosition > battle.max_players) {
        toast.error("Battle is full");
        return;
      }

      const { error } = await supabase
        .from("case_battle_participants")
        .insert({
          battle_id: battleId,
          user_id: user.id,
          position: nextPosition,
        });

      if (error) throw error;

      // If battle is now full, start it
      if (nextPosition === battle.max_players) {
        await supabase
          .from("case_battles")
          .update({ status: "active", started_at: new Date().toISOString() })
          .eq("id", battleId);
      }

      toast.success("Joined battle!");
    } catch (error: any) {
      console.error("Error joining battle:", error);
      if (error.code === "23505") {
        toast.error("You are already in this battle");
      } else {
        toast.error("Failed to join battle");
      }
    } finally {
      setLoading(false);
    }
  };

  const getModeDisplay = (mode: string) => {
    return mode.toUpperCase();
  };

  const getModeColor = (mode: string) => {
    switch (mode) {
      case "1v1":
        return "bg-blue-500/20 text-blue-400";
      case "1v1v1":
        return "bg-purple-500/20 text-purple-400";
      case "1v1v1v1":
        return "bg-orange-500/20 text-orange-400";
      default:
        return "bg-green-500/20 text-green-400";
    }
  };

  const toggleCaseSelection = (itemId: string) => {
    setSelectedCases((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const handleStartBattle = async (battleId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("case-battle-start", {
        body: { battleId },
      });

      if (error) throw error;

      toast.success("Battle started!");
      setCurrentRoundResults(data.results);
      
      const battle = battles.find((b) => b.id === battleId);
      if (battle) {
        setViewingBattle(battle);
        setShowingAnimations(true);
        setAnimationsCompleted(0);
      }
    } catch (error: any) {
      console.error("Error starting battle:", error);
      toast.error("Failed to start battle");
    } finally {
      setLoading(false);
    }
  };

  const handleNextRound = async () => {
    if (!viewingBattle) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("case-battle-next-round", {
        body: { battleId: viewingBattle.id },
      });

      if (error) throw error;

      if (data.completed) {
        toast.success("Battle completed!");
        setViewingBattle(null);
        fetchBattles();
      } else {
        toast.success(`Round ${data.round} started!`);
        setCurrentRoundResults(data.results);
        setShowingAnimations(true);
        setAnimationsCompleted(0);
      }
    } catch (error: any) {
      console.error("Error processing round:", error);
      toast.error("Failed to process round");
    } finally {
      setLoading(false);
    }
  };

  const handleAnimationComplete = () => {
    setAnimationsCompleted((prev) => prev + 1);
  };

  useEffect(() => {
    if (viewingBattle && animationsCompleted === viewingBattle.max_players) {
      setShowingAnimations(false);
      fetchBattles();
      
      // Auto-progress if not final round
      const battle = battles.find((b) => b.id === viewingBattle.id);
      if (battle && battle.current_round < battle.rounds) {
        setTimeout(() => handleNextRound(), 2000);
      }
    }
  }, [animationsCompleted, viewingBattle]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <TopBar />
      <div className="flex pt-16">
        <Sidebar />
        <main className="flex-1 p-8 ml-64">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-2">
                  Case Battles
                </h1>
                <p className="text-muted-foreground">Compete with other players to win the best items</p>
              </div>
              <Button size="lg" onClick={() => setShowCreateDialog(true)} className="gap-2">
                <Swords className="w-5 h-5" />
                Create Battle
              </Button>
            </div>

            <div className="grid gap-6">
              {battles.length === 0 ? (
                <Card className="p-12 text-center">
                  <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-xl font-semibold mb-2">No active battles</h3>
                  <p className="text-muted-foreground mb-6">Be the first to create a case battle!</p>
                  <Button onClick={() => setShowCreateDialog(true)}>Create First Battle</Button>
                </Card>
              ) : (
                battles.map((battle) => {
                  const battleParticipants = participants[battle.id] || [];
                  const isCreator = user?.id === battle.creator_id;
                  const isParticipant = battleParticipants.some((p) => p.user_id === user?.id);
                  const canJoin = battle.status === "waiting" && !isParticipant && battleParticipants.length < battle.max_players;

                  return (
                    <Card key={battle.id} className="p-6 hover:border-primary/50 transition-colors">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-primary">
                              ${battle.total_value.toFixed(2)}
                            </div>
                            <div className="text-xs text-muted-foreground">Total Value</div>
                          </div>
                          <div className="space-y-2">
                            <Badge className={getModeColor(battle.mode)}>{getModeDisplay(battle.mode)}</Badge>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Users className="w-4 h-4" />
                              {battleParticipants.length}/{battle.max_players} Players
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={battle.status === "waiting" ? "secondary" : battle.status === "active" ? "default" : "outline"}>
                            {battle.status}
                          </Badge>
                          <div className="text-sm text-muted-foreground mt-2">
                            Rounds: {battle.current_round}/{battle.rounds}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mb-4">
                        {Array.from({ length: battle.max_players }).map((_, index) => {
                          const participant = battleParticipants.find((p) => p.position === index + 1);
                          return (
                            <div key={index} className="flex flex-col items-center gap-2">
                              {participant ? (
                                <>
                                  <Avatar className="w-12 h-12 border-2 border-primary">
                                    <AvatarImage src={participant.profiles?.avatar_url || undefined} />
                                    <AvatarFallback>
                                      {participant.profiles?.username?.slice(0, 2).toUpperCase() || "??"}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-xs font-medium">{participant.profiles?.username}</span>
                                  {participant.total_value > 0 && (
                                    <span className="text-xs text-primary">${participant.total_value.toFixed(2)}</span>
                                  )}
                                </>
                              ) : (
                                <>
                                  <div className="w-12 h-12 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                                    <Users className="w-6 h-6 text-muted-foreground/30" />
                                  </div>
                                  <span className="text-xs text-muted-foreground">Waiting...</span>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">Cases:</span>
                          <span className="text-sm font-medium">
                            {Array.isArray(battle.cases) ? battle.cases.length : 0} selected
                          </span>
                        </div>
                        <div className="flex gap-2">
                          {canJoin && (
                            <Button onClick={() => handleJoinBattle(battle.id, battle)} disabled={loading} className="gap-2">
                              <Play className="w-4 h-4" />
                              Join Battle
                            </Button>
                          )}
                          {battle.status === "waiting" && battleParticipants.length === battle.max_players && isCreator && (
                            <Button onClick={() => handleStartBattle(battle.id)} disabled={loading} className="gap-2">
                              <Play className="w-4 h-4" />
                              Start Battle
                            </Button>
                          )}
                          {battle.status === "active" && (
                            <Button 
                              variant="secondary" 
                              className="gap-2"
                              onClick={() => setViewingBattle(battle)}
                            >
                              <Eye className="w-4 h-4" />
                              Watch
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        </main>
        <LiveChat />
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Case Battle</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Battle Mode</label>
                <Select value={selectedMode} onValueChange={setSelectedMode}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1v1">1v1 (2 Players)</SelectItem>
                    <SelectItem value="1v1v1">1v1v1 (3 Players)</SelectItem>
                    <SelectItem value="1v1v1v1">1v1v1v1 (4 Players)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Number of Rounds</label>
                <Select value={selectedRounds.toString()} onValueChange={(v) => setSelectedRounds(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Round</SelectItem>
                    <SelectItem value="3">3 Rounds</SelectItem>
                    <SelectItem value="5">5 Rounds</SelectItem>
                    <SelectItem value="10">10 Rounds</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Select Cases ({selectedCases.length} selected)
              </label>
              <div className="grid grid-cols-4 gap-4 max-h-96 overflow-y-auto p-4 border rounded-lg">
                {items.slice(0, 20).map((item) => (
                  <Card
                    key={item.id}
                    className={`p-4 cursor-pointer transition-all ${
                      selectedCases.includes(item.id)
                        ? "border-primary bg-primary/10"
                        : "hover:border-primary/50"
                    }`}
                    onClick={() => toggleCaseSelection(item.id)}
                  >
                    <img
                      src={item.image_url || "/placeholder.svg"}
                      alt={item.name}
                      className="w-full aspect-square object-contain mb-2"
                    />
                    <p className="text-xs font-medium text-center truncate">{item.name}</p>
                    <p className="text-xs text-primary text-center">${item.value.toFixed(2)}</p>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateBattle} disabled={loading || selectedCases.length === 0}>
              Create Battle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Battle View Dialog */}
      <Dialog open={!!viewingBattle} onOpenChange={() => setViewingBattle(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Battle in Progress</span>
              {viewingBattle && (
                <Badge className="text-lg">
                  Round {viewingBattle.current_round}/{viewingBattle.rounds}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {viewingBattle && showingAnimations && currentRoundResults.length > 0 && (
            <div className="space-y-6">
              {participants[viewingBattle.id]?.map((participant, index) => {
                const participantResults = currentRoundResults.filter(
                  (r) => r.user_id === participant.user_id
                );
                const wonItem = participantResults[0];

                if (!wonItem) return null;

                return (
                  <CaseOpeningAnimation
                    key={participant.id}
                    items={items}
                    wonItem={wonItem}
                    onComplete={handleAnimationComplete}
                    playerName={participant.profiles?.username || "Unknown"}
                    position={index}
                  />
                );
              })}
            </div>
          )}

          {viewingBattle && !showingAnimations && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                {participants[viewingBattle.id]?.map((participant) => (
                  <Card key={participant.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="w-12 h-12 border-2 border-primary">
                          <AvatarImage src={participant.profiles?.avatar_url || undefined} />
                          <AvatarFallback>
                            {participant.profiles?.username?.slice(0, 2).toUpperCase() || "??"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{participant.profiles?.username}</p>
                          <p className="text-sm text-muted-foreground">
                            Position {participant.position}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">
                          ${participant.total_value.toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground">Total Value</div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {viewingBattle.status === "active" && viewingBattle.current_round < viewingBattle.rounds && (
                <Button 
                  className="w-full" 
                  size="lg" 
                  onClick={handleNextRound}
                  disabled={loading}
                >
                  Next Round ({viewingBattle.current_round + 1}/{viewingBattle.rounds})
                </Button>
              )}

              {viewingBattle.status === "completed" && (
                <div className="text-center p-6 bg-gradient-to-r from-primary/20 to-primary/10 rounded-lg">
                  <Trophy className="w-16 h-16 mx-auto mb-4 text-primary" />
                  <h3 className="text-2xl font-bold mb-2">Battle Complete!</h3>
                  <p className="text-muted-foreground">
                    Winner: {participants[viewingBattle.id]?.find(p => p.user_id === viewingBattle.winner_id)?.profiles?.username}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
