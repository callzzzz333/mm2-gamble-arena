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
import { useItemResaleData } from "@/hooks/useItemResaleData";
import { Package, TrendingUp, ArrowUpRight, ArrowDownRight, Minus, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

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
  image_url: string | null;
}

const Items = () => {
  const { data: rolimonsData, loading, error, refetch } = useRolimonsData();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"value-desc" | "value-asc" | "name" | "rap-desc">("value-desc");
  const [selectedGame, setSelectedGame] = useState<"all" | "MM2" | "SAB" | "PVB" | "GAG" | "ADM">("all");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const { data: resaleData, loading: resaleLoading } = useItemResaleData(selectedItemId);

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
                  <div className="space-y-3">
                    {filteredItems.map((item) => (
                      <Card 
                        key={item.rolimons_id} 
                        className="hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => setSelectedItemId(item.rolimons_id)}
                      >
                        <div className="flex items-center gap-4 p-4">
                          <div className="w-16 h-16 rounded bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {item.image_url ? (
                              <img 
                                src={item.image_url} 
                                alt={item.name}
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const parent = e.currentTarget.parentElement;
                                  if (parent) {
                                    const icon = document.createElement('div');
                                    icon.innerHTML = '<svg class="w-10 h-10 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>';
                                    parent.appendChild(icon.firstChild!);
                                  }
                                }}
                              />
                            ) : (
                              <Package className="w-10 h-10 text-muted-foreground" />
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <div className="min-w-0 flex-1">
                                <h3 className="font-semibold text-base truncate">{item.name}</h3>
                                {item.acronym && (
                                  <p className="text-xs text-muted-foreground">{item.acronym}</p>
                                )}
                              </div>
                              
                              <div className="flex gap-1">
                                {item.projected !== -1 && (
                                  <Badge variant="secondary" className="text-xs">P</Badge>
                                )}
                                {item.hyped !== -1 && (
                                  <Badge variant="secondary" className="text-xs bg-orange-500/10 text-orange-500">H</Badge>
                                )}
                                {item.rare !== -1 && (
                                  <Badge variant="secondary" className="text-xs bg-purple-500/10 text-purple-500">R</Badge>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-6">
                              <div>
                                <p className="text-xs text-muted-foreground">RAP</p>
                                <p className="font-bold text-sm">{formatValue(item.rap)}</p>
                              </div>
                              
                              <div>
                                <p className="text-xs text-muted-foreground">Value</p>
                                <p className="font-bold text-sm text-primary">{formatValue(item.value)}</p>
                              </div>
                              
                              <div>
                                <p className="text-xs text-muted-foreground">Demand</p>
                                <p className={`font-semibold text-sm ${getDemandColor(item.demand)}`}>
                                  {item.demand === -1 ? "N/A" : `${item.demand}/10`}
                                </p>
                              </div>
                              
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-muted-foreground">Trend:</span>
                                {getTrendIcon(item.trend)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
          ))}
        </Tabs>

        {/* Item Detail Dialog with Trend Chart */}
        <Dialog open={!!selectedItemId} onOpenChange={() => setSelectedItemId(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            {selectedItemId && (() => {
              const item = filteredItems.find(i => i.rolimons_id === selectedItemId);
              if (!item) return null;
              
              return (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                      {item.image_url && (
                        <img 
                          src={item.image_url} 
                          alt={item.name}
                          className="w-12 h-12 rounded object-contain bg-muted"
                        />
                      )}
                      {item.name}
                    </DialogTitle>
                  </DialogHeader>

                  <div className="space-y-6">
                    {/* Item Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">RAP</p>
                        <p className="text-xl font-bold">{formatValue(item.rap)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Value</p>
                        <p className="text-xl font-bold text-primary">{formatValue(item.value)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Demand</p>
                        <p className={`text-xl font-bold ${getDemandColor(item.demand)}`}>
                          {item.demand === -1 ? "N/A" : `${item.demand}/10`}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Trend</p>
                        <div className="flex items-center gap-1">
                          {getTrendIcon(item.trend)}
                        </div>
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="flex gap-2">
                      {item.projected !== -1 && (
                        <Badge variant="secondary">Projected</Badge>
                      )}
                      {item.hyped !== -1 && (
                        <Badge variant="secondary" className="bg-orange-500/10 text-orange-500">Hyped</Badge>
                      )}
                      {item.rare !== -1 && (
                        <Badge variant="secondary" className="bg-purple-500/10 text-purple-500">Rare</Badge>
                      )}
                    </div>

                    {/* Price History Chart */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Price History</h3>
                      {resaleLoading ? (
                        <div className="h-64 flex items-center justify-center">
                          <p className="text-muted-foreground">Loading chart data...</p>
                        </div>
                      ) : resaleData?.hasData && resaleData.sales.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={resaleData.sales}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis 
                              dataKey="date" 
                              className="text-xs"
                              tick={{ fill: 'hsl(var(--muted-foreground))' }}
                            />
                            <YAxis 
                              className="text-xs"
                              tick={{ fill: 'hsl(var(--muted-foreground))' }}
                            />
                            <Tooltip 
                              contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                              }}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="price" 
                              stroke="hsl(var(--primary))" 
                              strokeWidth={2}
                              dot={{ fill: 'hsl(var(--primary))' }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-64 flex items-center justify-center border rounded-lg bg-muted/20">
                          <p className="text-muted-foreground">No price history available for this item</p>
                        </div>
                      )}
                    </div>

                    {/* Stock Info */}
                    {resaleData?.hasData && (
                      <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
                        {resaleData.assetStock !== undefined && (
                          <div>
                            <p className="text-sm text-muted-foreground">Total Stock</p>
                            <p className="text-lg font-semibold">{resaleData.assetStock.toLocaleString()}</p>
                          </div>
                        )}
                        {resaleData.numberRemaining !== undefined && (
                          <div>
                            <p className="text-sm text-muted-foreground">Remaining</p>
                            <p className="text-lg font-semibold">{resaleData.numberRemaining.toLocaleString()}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </DialogContent>
        </Dialog>
      </main>
    </div>
    <LiveChat />
    <MobileBottomNav />
  </div>
);
};

export default Items;
