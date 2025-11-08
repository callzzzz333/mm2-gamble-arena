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

interface Crate {
  id: string;
  name: string;
  description: string | null;
  level_required: number;
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
  const [crates, setCrates] = useState<Crate[]>([]);
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
    fetchCrates();
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
        (payload) => {
          console.log("Battle updated:", payload);
          const updatedBattle = payload.new as any;
          
          // If viewing this battle and status changed, fetch latest data
          if (viewingBattle && updatedBattle.id === viewingBattle.id) {
            console.log("Viewing battle updated, refreshing...");
            fetchBattles();
            
            // If battle just became active, fetch the first round results
            if (updatedBattle.status === "active" && updatedBattle.current_round === 1) {
              setTimeout(() => fetchRoundResults(updatedBattle.id, 1), 500);
            }
          } else {
            fetchBattles();
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "case_battle_participants",
        },
        (payload) => {
          console.log("Participant updated:", payload);
          fetchBattles();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "case_battle_rounds",
        },
        (payload) => {
          console.log("New round created:", payload);
          const newRound = payload.new as any;
          
          // If viewing this battle, show animations for the new round
          if (viewingBattle && newRound.battle_id === viewingBattle.id) {
            console.log("New round for viewing battle, showing animations");
            setCurrentRoundResults(newRound.results);
            setShowingAnimations(true);
            setAnimationsCompleted(0);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [viewingBattle]);

  // Auto-close battle viewer when battle completes
  useEffect(() => {
    if (viewingBattle && viewingBattle.status === "completed" && !showingAnimations) {
      const timer = setTimeout(() => {
        console.log("Battle completed, auto-closing viewer");
        setViewingBattle(null);
        fetchBattles();
      }, 3000); // Give users 3s to see the completion message
      
      return () => clearTimeout(timer);
    }
  }, [viewingBattle, showingAnimations]);

  const fetchRoundResults = async (battleId: string, roundNumber: number) => {
    const { data, error } = await supabase
      .from("case_battle_rounds")
      .select("*")
      .eq("battle_id", battleId)
      .eq("round_number", roundNumber)
      .maybeSingle();

    if (error || !data) {
      console.error("Error fetching round results:", error);
      return;
    }

    const results = Array.isArray(data.results) ? data.results : [];
    setCurrentRoundResults(results);
    setShowingAnimations(true);
    setAnimationsCompleted(0);
  };

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
    try {
      const { data, error } = await supabase
        .from("case_battles")
        .select("*")
        .in("status", ["waiting", "active"])
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching battles:", error);
        return;
      }

      setBattles(data || []);

      // Fetch participants for each battle
      const participantPromises = (data || []).map((battle) => fetchParticipants(battle.id));
      await Promise.all(participantPromises);
      
      console.log("Fetched", data?.length || 0, "battles");
    } catch (error) {
      console.error("Exception fetching battles:", error);
    }
  };

  const fetchParticipants = async (battleId: string) => {
    try {
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
            .maybeSingle();

          return {
            ...participant,
            profiles: profile || { username: "Unknown", avatar_url: null },
          };
        })
      );

      setParticipants((prev) => ({
        ...prev,
        [battleId]: participantsWithProfiles,
      }));
    } catch (error) {
      console.error("Exception fetching participants:", error);
    }
  };

  const fetchCrates = async () => {
    const { data, error } = await supabase
      .from("crates")
      .select("*")
      .order("level_required", { ascending: true });

    if (error) {
      console.error("Error fetching crates:", error);
      return;
    }

    setCrates(data || []);
  };

  const handleCreateBattle = async () => {
    if (!user) {
      toast.error("Please login first");
      return;
    }
    
    if (selectedCases.length === 0) {
      toast.error("Please select at least one case");
      return;
    }

    setLoading(true);

    try {
      const maxPlayers = selectedMode === "1v1" ? 2 : selectedMode === "1v1v1" ? 3 : 4;
      const totalValue = selectedCases.length * selectedRounds * 50; // Estimated value per case

      console.log("Creating battle:", { maxPlayers, rounds: selectedRounds, cases: selectedCases });

      const { data: battle, error: battleError } = await supabase
        .from("case_battles")
        .insert({
          creator_id: user.id,
          total_value: totalValue,
          mode: selectedMode,
          max_players: maxPlayers,
          rounds: selectedRounds,
          cases: selectedCases,
          status: "waiting",
        })
        .select()
        .single();

      if (battleError) {
        console.error("Battle creation error:", battleError);
        throw battleError;
      }

      console.log("Battle created:", battle.id);

      // Add creator as first participant
      const { error: participantError } = await supabase
        .from("case_battle_participants")
        .insert({
          battle_id: battle.id,
          user_id: user.id,
          position: 1,
        });

      if (participantError) {
        console.error("Participant error:", participantError);
        throw participantError;
      }

      toast.success("Battle created successfully!");
      setShowCreateDialog(false);
      setSelectedCases([]);
      setSelectedMode("1v1");
      setSelectedRounds(1);
      
      // Refresh battles list
      await fetchBattles();
    } catch (error: any) {
      console.error("Error creating battle:", error);
      toast.error(error.message || "Failed to create battle");
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
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from("case_battle_participants")
        .insert({
          battle_id: battleId,
          user_id: user.id,
          position: nextPosition,
        });

      if (error) {
        if (error.code === "23505") {
          toast.error("You are already in this battle");
        } else {
          throw error;
        }
        setLoading(false);
        return;
      }

      toast.success("Joined battle!");
      
      // Auto-start when full
      if (nextPosition === battle.max_players) {
        console.log("Battle full, auto-starting...");
        setTimeout(async () => {
          try {
            const { data, error: startError } = await supabase.functions.invoke(
              "case-battle-start",
              { body: { battleId } }
            );

            if (startError) {
              console.error("Error auto-starting:", startError);
              toast.error("Failed to start battle");
            } else {
              console.log("Battle started:", data);
            }
          } catch (err) {
            console.error("Exception auto-starting:", err);
          }
        }, 1000);
      }
    } catch (error: any) {
      console.error("Error joining battle:", error);
      toast.error("Failed to join battle");
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

  const toggleCaseSelection = (crateId: string) => {
    setSelectedCases((prev) =>
      prev.includes(crateId) ? prev.filter((id) => id !== crateId) : [...prev, crateId]
    );
  };

  const handleStartBattle = async (battleId: string) => {
    if (!user) return;
    
    setLoading(true);
    try {
      console.log("Starting battle:", battleId);
      
      const { data, error } = await supabase.functions.invoke("case-battle-start", {
        body: { battleId },
      });

      if (error) {
        console.error("Edge function error:", error);
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || "Failed to start battle");
      }

      console.log("Battle started successfully:", data);
      toast.success("Battle started!");
      
      // Open battle viewer
      const battle = battles.find((b) => b.id === battleId);
      if (battle) {
        setViewingBattle(battle);
        setCurrentRoundResults(data.results);
        setShowingAnimations(true);
        setAnimationsCompleted(0);
      }
    } catch (error: any) {
      console.error("Error starting battle:", error);
      toast.error(error.message || "Failed to start battle");
    } finally {
      setLoading(false);
    }
  };

  const handleNextRound = async () => {
    if (!viewingBattle) return;

    setLoading(true);
    try {
      console.log("Processing next round for:", viewingBattle.id);
      
      const { data, error } = await supabase.functions.invoke("case-battle-next-round", {
        body: { battleId: viewingBattle.id },
      });

      if (error) {
        console.error("Edge function error:", error);
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || "Failed to process round");
      }

      console.log("Round processed:", data);

      if (data.completed) {
        toast.success("Battle completed!");
        setTimeout(() => {
          setViewingBattle(null);
          fetchBattles();
        }, 2000);
      } else {
        toast.success(`Round ${data.round} complete!`);
        setCurrentRoundResults(data.results);
        setShowingAnimations(true);
        setAnimationsCompleted(0);
      }
    } catch (error: any) {
      console.error("Error processing round:", error);
      toast.error(error.message || "Failed to process round");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (viewingBattle && showingAnimations && currentRoundResults.length > 0) {
      // Auto-complete animations after showing all items
      const totalParticipants = participants[viewingBattle.id]?.length || 0;
      const itemsPerParticipant = currentRoundResults.filter(r => r.user_id === participants[viewingBattle.id]?.[0]?.user_id).length;
      const animationDelay = itemsPerParticipant * 100 + 2000; // 100ms per item + 2s buffer
      
      const timer = setTimeout(() => {
        console.log("Auto-completing animations after display");
        setAnimationsCompleted(totalParticipants);
      }, animationDelay);
      
      return () => clearTimeout(timer);
    }
  }, [viewingBattle, showingAnimations, currentRoundResults, participants]);

  useEffect(() => {
    if (viewingBattle && animationsCompleted > 0 && animationsCompleted === (participants[viewingBattle.id]?.length || 0) && showingAnimations) {
      console.log("All animations completed");
      setShowingAnimations(false);
      
      // Refresh battle data
      setTimeout(async () => {
        await fetchBattles();
        
        // Get the latest battle state
        const { data: latestBattle } = await supabase
          .from("case_battles")
          .select("*")
          .eq("id", viewingBattle.id)
          .maybeSingle();
        
        if (!latestBattle) return;
        
        setViewingBattle(latestBattle);
        
        // If there are more rounds and battle is still active, don't auto-trigger next round
        // Let the user click the button instead
        if (latestBattle.status === "completed") {
          console.log("Battle is now completed");
        }
      }, 500);
    }
  }, [animationsCompleted, viewingBattle, showingAnimations, participants]);

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
                          {(battle.status === "active" || battle.status === "completed") && (
                            <Button 
                              variant="secondary" 
                              className="gap-2"
                              onClick={async () => {
                                setViewingBattle(battle);
                                
                                // Fetch latest round results if active
                                if (battle.status === "active") {
                                  const { data: latestRound } = await supabase
                                    .from("case_battle_rounds")
                                    .select("*")
                                    .eq("battle_id", battle.id)
                                    .eq("round_number", battle.current_round)
                                    .maybeSingle();
                                  
                                  if (latestRound && Array.isArray(latestRound.results)) {
                                    setCurrentRoundResults(latestRound.results);
                                  }
                                }
                              }}
                            >
                              <Eye className="w-4 h-4" />
                              {battle.status === "active" ? "Watch" : "View"}
                            </Button>
                          )}
                          {battle.status === "completed" && (
                            <Button 
                              variant="outline" 
                              className="gap-2"
                              onClick={() => navigate(`/battle-results/${battle.id}`)}
                            >
                              <Trophy className="w-4 h-4" />
                              Results
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
                Select Cases ({selectedCases.length} selected) - Each case contains 8 random items
              </label>
              <div className="grid grid-cols-4 gap-4 max-h-96 overflow-y-auto p-4 border rounded-lg">
                {crates.map((crate) => (
                  <Card
                    key={crate.id}
                    className={`p-4 cursor-pointer transition-all ${
                      selectedCases.includes(crate.id)
                        ? "border-primary bg-primary/10"
                        : "hover:border-primary/50"
                    }`}
                    onClick={() => toggleCaseSelection(crate.id)}
                  >
                    <div className="w-full aspect-square bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg flex items-center justify-center mb-2">
                      <span className="text-4xl">📦</span>
                    </div>
                    <p className="text-xs font-medium text-center truncate">{crate.name}</p>
                    <p className="text-xs text-muted-foreground text-center">Lvl {crate.level_required}+</p>
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
                
                if (participantResults.length === 0) {
                  console.warn("No results for participant:", participant.user_id);
                  return null;
                }

                // Show all items won in this round for this participant
                return (
                  <div key={`${participant.id}-${viewingBattle.current_round}`} className="space-y-2">
                    <div className="flex items-center justify-between px-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={participant.profiles?.avatar_url || undefined} />
                          <AvatarFallback>
                            {participant.profiles?.username?.slice(0, 2).toUpperCase() || "??"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-semibold">{participant.profiles?.username}</span>
                      </div>
                      <span className="text-sm text-primary font-bold">
                        ${participantResults.reduce((sum, r) => sum + r.value, 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="grid grid-cols-8 gap-2 p-4 bg-card/50 rounded-lg">
                      {participantResults.map((result, idx) => (
                        <Card key={idx} className="p-2 animate-fade-in" style={{ animationDelay: `${idx * 100}ms` }}>
                          <img
                            src={result.image_url || "/placeholder.svg"}
                            alt={result.name}
                            className="w-full aspect-square object-contain mb-1"
                          />
                          <p className="text-xs font-medium text-center truncate">{result.name}</p>
                          <p className="text-xs text-primary text-center">${result.value.toFixed(2)}</p>
                        </Card>
                      ))}
                    </div>
                  </div>
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

              {viewingBattle.status === "active" && viewingBattle.current_round < viewingBattle.rounds && !loading && (
                <Button 
                  className="w-full" 
                  size="lg" 
                  onClick={handleNextRound}
                  disabled={loading}
                >
                  Next Round ({viewingBattle.current_round + 1}/{viewingBattle.rounds})
                </Button>
              )}
              
              {loading && (
                <div className="text-center text-muted-foreground">
                  Processing...
                </div>
              )}

              {viewingBattle.status === "completed" && (
                <div className="space-y-4">
                  <div className="text-center p-6 bg-gradient-to-r from-primary/20 to-primary/10 rounded-lg">
                    <Trophy className="w-16 h-16 mx-auto mb-4 text-primary" />
                    <h3 className="text-2xl font-bold mb-2">Battle Complete!</h3>
                    <p className="text-muted-foreground mb-4">
                      Winner: {participants[viewingBattle.id]?.find(p => p.user_id === viewingBattle.winner_id)?.profiles?.username}
                    </p>
                  </div>
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => {
                      setViewingBattle(null);
                      navigate(`/battle-results/${viewingBattle.id}`);
                    }}
                  >
                    <Trophy className="w-5 h-5 mr-2" />
                    View Detailed Results
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
