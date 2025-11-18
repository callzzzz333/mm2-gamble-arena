import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { LiveChat } from "@/components/LiveChat";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useRolimonsData } from "@/hooks/useRolimonsData";
import { Package, TrendingUp, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Item {
  rolimons_id: string;
  name: string;
  acronym: string;
  rap: number;
  value: number;
  default_value: number;
  demand: number;
  trend: number;
  projected: number;
  hyped: number;
  rare: number;
}

const Items = () => {
  const { data: rolimonsData, loading, error, refetch } = useRolimonsData();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"value-desc" | "value-asc" | "name" | "rap-desc">("value-desc");
  const [selectedGame, setSelectedGame] = useState<"all" | "MM2" | "SAB" | "PVB" | "GAG" | "ADM">("all");

  const items = rolimonsData?.items || [];

  const filteredItems = items
    .filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "value-asc") return (a.value === -1 ? Infinity : a.value) - (b.value === -1 ? Infinity : b.value);
      if (sortBy === "rap-desc") return b.rap - a.rap;
      return (b.value === -1 ? -Infinity : b.value) - (a.value === -1 ? -Infinity : a.value);
    });

  const getTrendIcon = (trend: number) => {
    if (trend === 1) return <ArrowUpRight className="w-4 h-4 text-green-500" />;
    if (trend === -1) return <ArrowDownRight className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const getDemandColor = (demand: number) => {
    if (demand === -1) return "text-muted-foreground";
    if (demand >= 8) return "text-green-500";
    if (demand >= 5) return "text-yellow-500";
    if (demand >= 3) return "text-orange-500";
    return "text-red-500";
  };

  const formatValue = (value: number) => {
    if (value === -1) return "N/A";
    if (value >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

interface GameInfo {
  title: string;
  description: string;
  conversionRate: string;
  source: string;
}

  const gameInfo: Record<"all" | "MM2" | "SAB" | "PVB" | "GAG" | "ADM", GameInfo> = {
    all: {
      title: "All Roblox Limited Items",
      description: "Complete catalog of Roblox limited items with live values from Rolimons",
      conversionRate: "RAP = Recent Average Price",
      source: "Rolimons API"
    },
    MM2: {
      title: "Murder Mystery 2",
      description: "All MM2 items with USD values",
      conversionRate: "100 Value = $1.00 USD",
      source: "Rolimons"
    },
    SAB: {
      title: "Skibi Attack Battles",
      description: "All SAB items and their values",
      conversionRate: "TBD",
      source: "Community Market"
    },
    PVB: {
      title: "PVB Items",
      description: "All PVB items and their values",
      conversionRate: "TBD",
      source: "Community Market"
    },
    GAG: {
      title: "Grow A Garden",
      description: "All GAG items and their values",
      conversionRate: "TBD",
      source: "Community Market"
    },
    ADM: {
      title: "Adopt Me",
      description: "All Adopt Me items and their values",
      conversionRate: "TBD",
      source: "Community Market"
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <div className="flex-1 md:ml-64">
        <TopBar />
        
        <main className="container mx-auto px-4 py-8 pb-24 md:pb-8">
          <Tabs value={selectedGame} onValueChange={(value) => setSelectedGame(value as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-6 mb-8">
              <TabsTrigger value="all">All Items</TabsTrigger>
              <TabsTrigger value="MM2">MM2</TabsTrigger>
              <TabsTrigger value="SAB">SAB</TabsTrigger>
              <TabsTrigger value="PVB">PVB</TabsTrigger>
              <TabsTrigger value="GAG">GAG</TabsTrigger>
              <TabsTrigger value="ADM">ADM</TabsTrigger>
            </TabsList>

            {(["all", "MM2", "SAB", "PVB", "GAG", "ADM"] as const).map((game) => (
              <TabsContent key={game} value={game} className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                  <div>
                    <h1 className="text-4xl font-bold mb-2">{gameInfo[game].title}</h1>
                    <p className="text-muted-foreground">{gameInfo[game].description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline">{gameInfo[game].conversionRate}</Badge>
                      <Badge variant="secondary">Source: {gameInfo[game].source}</Badge>
                      {rolimonsData && (
                        <Badge variant="outline" className="gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {rolimonsData.item_count} Items
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    onClick={refetch}
                    disabled={loading}
                    className="gap-2"
                  >
                    {loading ? "Refreshing..." : "Refresh Data"}
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="md:col-span-2">
                    <Input
                      placeholder="Search items by name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant={sortBy === "value-desc" ? "default" : "outline"}
                      onClick={() => setSortBy("value-desc")}
                      size="sm"
                    >
                      Value ↓
                    </Button>
                    <Button
                      variant={sortBy === "rap-desc" ? "default" : "outline"}
                      onClick={() => setSortBy("rap-desc")}
                      size="sm"
                    >
                      RAP ↓
                    </Button>
                    <Button
                      variant={sortBy === "name" ? "default" : "outline"}
                      onClick={() => setSortBy("name")}
                      size="sm"
                    >
                      Name
                    </Button>
                  </div>
                </div>

                {loading ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {[...Array(8)].map((_, i) => (
                      <Card key={i} className="overflow-hidden">
                        <Skeleton className="aspect-square w-full" />
                        <div className="p-4 space-y-2">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-6 w-1/2" />
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : error ? (
                  <Card className="p-12 text-center">
                    <Package className="w-16 h-16 mx-auto mb-4 text-destructive" />
                    <h3 className="text-xl font-semibold mb-2">Failed to load items</h3>
                    <p className="text-muted-foreground mb-4">{error}</p>
                    <Button onClick={refetch}>Retry</Button>
                  </Card>
                ) : filteredItems.length === 0 ? (
                  <Card className="p-12 text-center">
                    <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-xl font-semibold mb-2">No items found</h3>
                    <p className="text-muted-foreground">Try adjusting your search</p>
                  </Card>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filteredItems.map((item) => (
                      <Card key={item.rolimons_id} className="overflow-hidden hover:shadow-lg transition-all hover:scale-105">
                        <div className="aspect-square bg-gradient-to-br from-card to-card/50 flex items-center justify-center p-4">
                          <Package className="w-16 h-16 text-muted-foreground" />
                        </div>
                        <div className="p-4 space-y-3">
                          <div>
                            <h3 className="font-semibold text-sm leading-tight line-clamp-2 mb-1">{item.name}</h3>
                            {item.acronym && (
                              <p className="text-xs text-muted-foreground">{item.acronym}</p>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                RAP
                              </p>
                              <p className="font-bold text-lg">{formatValue(item.rap)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Value</p>
                              <p className="font-bold text-lg text-primary">{formatValue(item.value)}</p>
                            </div>
                          </div>

                          <div className="flex justify-between items-center pt-2 border-t">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Demand:</span>
                              <span className={`text-sm font-semibold ${getDemandColor(item.demand)}`}>
                                {item.demand === -1 ? "N/A" : `${item.demand}/10`}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">Trend:</span>
                              {getTrendIcon(item.trend)}
                            </div>
                          </div>

                          {(item.projected !== -1 || item.hyped !== -1 || item.rare !== -1) && (
                            <div className="flex gap-1 flex-wrap">
                              {item.projected !== -1 && (
                                <Badge variant="secondary" className="text-xs">Projected</Badge>
                              )}
                              {item.hyped !== -1 && (
                                <Badge variant="secondary" className="text-xs">Hyped</Badge>
                              )}
                              {item.rare !== -1 && (
                                <Badge variant="secondary" className="text-xs">Rare</Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </main>
      </div>
      <LiveChat />
      <MobileBottomNav />
    </div>
  );
};

export default Items;
