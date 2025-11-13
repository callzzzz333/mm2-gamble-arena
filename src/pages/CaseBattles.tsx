import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { LiveChat } from "@/components/LiveChat";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Package } from "lucide-react";

export default function CaseBattles() {
  const [selectedMode, setSelectedMode] = useState<"1v1" | "1v1v1" | "1v1v1v1" | "2v2">("1v1");
  const [selectedCases, setSelectedCases] = useState<string[]>([]);

  const cases = [
    { id: "legendary", name: "Legendary Case", value: 100, color: "from-orange-500 to-red-500" },
    { id: "ancient", name: "Ancient Case", value: 75, color: "from-purple-500 to-pink-500" },
    { id: "rare", name: "Rare Case", value: 50, color: "from-blue-500 to-cyan-500" },
    { id: "uncommon", name: "Uncommon Case", value: 25, color: "from-green-500 to-emerald-500" },
    { id: "common", name: "Common Case", value: 10, color: "from-gray-500 to-zinc-500" },
  ];

  const modes = [
    { id: "1v1", label: "1 VS 1", players: 2 },
    { id: "1v1v1", label: "1 VS 1 VS 1", players: 3 },
    { id: "1v1v1v1", label: "1 VS 1 VS 1 VS 1", players: 4 },
    { id: "2v2", label: "2 VS 2", players: 4 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="md:ml-64 md:mr-96">
        <TopBar />
        <main className="p-4 md:p-8 pt-20 md:pt-24">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow">
                <Trophy className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Case Battles</h1>
                <p className="text-muted-foreground">Compete against other players opening cases</p>
              </div>
            </div>

            {/* Create Battle */}
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Create Battle</h2>
              
              {/* Mode Selection */}
              <div className="mb-6">
                <label className="text-sm font-medium mb-3 block">Battle Mode</label>
                <div className="grid grid-cols-4 gap-3">
                  {modes.map((mode) => (
                    <Button
                      key={mode.id}
                      variant={selectedMode === mode.id ? "default" : "outline"}
                      className="h-16 flex flex-col gap-1"
                      onClick={() => setSelectedMode(mode.id as any)}
                    >
                      <Users className="w-5 h-5" />
                      <span className="text-xs font-bold">{mode.label}</span>
                      <span className="text-[10px] text-muted-foreground">{mode.players} Players</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Case Selection */}
              <div className="mb-6">
                <label className="text-sm font-medium mb-3 block">Select Cases (Max 3)</label>
                <div className="grid grid-cols-5 gap-3">
                  {cases.map((caseItem) => (
                    <button
                      key={caseItem.id}
                      onClick={() => {
                        if (selectedCases.includes(caseItem.id)) {
                          setSelectedCases(selectedCases.filter((id) => id !== caseItem.id));
                        } else if (selectedCases.length < 3) {
                          setSelectedCases([...selectedCases, caseItem.id]);
                        }
                      }}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedCases.includes(caseItem.id)
                          ? "border-primary bg-primary/10 scale-105"
                          : "border-border hover:border-primary/50 bg-card"
                      }`}
                    >
                      <div className={`w-full h-20 rounded-lg bg-gradient-to-br ${caseItem.color} mb-2 flex items-center justify-center`}>
                        <Package className="w-10 h-10 text-white" />
                      </div>
                      <p className="font-semibold text-sm">{caseItem.name}</p>
                      <p className="text-xs text-muted-foreground">${caseItem.value}</p>
                      {selectedCases.includes(caseItem.id) && (
                        <Badge className="mt-1 text-xs">
                          x{selectedCases.filter((id) => id === caseItem.id).length}
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Battle Summary */}
              {selectedCases.length > 0 && (
                <div className="bg-secondary/30 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Cost per Player</p>
                      <p className="text-2xl font-bold text-primary">
                        ${selectedCases.reduce((sum, id) => sum + (cases.find((c) => c.id === id)?.value || 0), 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground text-right">Cases Selected</p>
                      <p className="text-2xl font-bold">{selectedCases.length} / 3</p>
                    </div>
                  </div>
                </div>
              )}

              <Button 
                className="w-full" 
                size="lg"
                disabled={selectedCases.length === 0}
              >
                Create Battle
              </Button>
            </Card>

            {/* Active Battles */}
            <div>
              <h2 className="text-xl font-bold mb-4">Active Battles</h2>
              <Card className="p-8 text-center">
                <Trophy className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No active battles. Create one to get started!</p>
              </Card>
            </div>
          </div>
        </main>
      </div>
      <LiveChat />
      
      <div className="h-20 md:hidden" />
    </div>
  );
}
