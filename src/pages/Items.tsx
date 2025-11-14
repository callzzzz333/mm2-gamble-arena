import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { LiveChat } from "@/components/LiveChat";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Package, ExternalLink } from "lucide-react";

interface Item {
  id: string;
  name: string;
  rarity: string;
  value: number;
  image_url: string | null;
  game_type: string;
  demand?: number | null;
}

const Items = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRarity, setSelectedRarity] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"value-desc" | "value-asc" | "name">("value-desc");
  const [selectedGame, setSelectedGame] = useState<"MM2" | "SAB" | "PVB" | "GAG">("MM2");

  useEffect(() => {
    fetchItems();
  }, [selectedGame]);

  const fetchItems = async () => {
    try {
      // Cast supabase client to any to bypass deep type inference issues
      const client: any = supabase;
      // @ts-ignore - suppress deep instantiation from client chain
      const result = await client
        .from("items")
        .select("*")
        .eq("game_type", selectedGame as any)
        .order("value", { ascending: false });

      if (result.error) {
        console.error("Error fetching items:", result.error);
        return;
      }

      setItems((result.data || []) as Item[]);
    } catch (err) {
      console.error("Error in fetchItems:", err);
    }
  };

  // Real-time subscription for items
  useEffect(() => {
    const channel = supabase
      .channel('items-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'items'
        },
        () => {
          fetchItems();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const rarities = ["all", ...new Set(items.map(item => item.rarity))];

  const filteredItems = items
    .filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRarity = selectedRarity === "all" || item.rarity === selectedRarity;
      return matchesSearch && matchesRarity;
    })
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "value-asc") return a.value - b.value;
      return b.value - a.value; // value-desc
    });

  const getRarityColor = (rarity: string) => {
    const colors: Record<string, string> = {
      "Chroma": "bg-gradient-to-r from-red-500 via-yellow-500 to-purple-500",
      "Ancient": "bg-red-600",
      "Godly": "bg-purple-600",
      "Legendary": "bg-yellow-500",
      "Unique": "bg-blue-500",
      "Rare": "bg-green-500",
      "Uncommon": "bg-gray-500",
      "Common": "bg-slate-500"
    };
    return colors[rarity] || "bg-gray-500";
  };

  const getRarityCount = (rarity: string) => {
    if (rarity === "all") return items.length;
    return items.filter(item => item.rarity === rarity).length;
  };

interface GameInfo {
  title: string;
  description: string;
  conversionRate: string;
  source: string;
  externalUrl?: string;
}

  const gameInfo: Record<"MM2" | "SAB" | "PVB" | "GAG", GameInfo> = {
    MM2: {
      title: "MM2 Items",
      description: "All Murder Mystery 2 items with USD values",
      conversionRate: "100 Value = $1.00 USD",
      source: "Based on Supreme Values"
    },
    SAB: {
      title: "Steal A Brainrot Values",
      description: "All SAB brainrots with their trading values",
      conversionRate: "Values in K (thousands)",
      source: "Powered by Voxel Values",
      externalUrl: "https://sab.voxelvalues.com/"
    },
    PVB: {
      title: "Plants vs Brainrots Values",
      description: "All PVB plants, bosses, and brainrots",
      conversionRate: "Cost and Damage values",
      source: "Powered by Voxel Values",
      externalUrl: "https://plantsvsbrainrotsvalues.com/"
    },
    GAG: {
      title: "Grow a Garden Values",
      description: "All pets and crops with demand ratings",
      conversionRate: "Pet and Crop values",
      source: "Live trends and demand",
      externalUrl: "https://growagardenvalues.gg/values"
    }
  };

  return (
    <div className="min-h-screen w-full flex">
      <Sidebar />
      
      <div className="flex-1 md:ml-64 md:mr-96">
        <TopBar />
        
        <main className="pt-20 md:pt-16 px-4 md:px-12 py-8 pb-24">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow">
                <Package className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Game Items & Values</h1>
                <p className="text-muted-foreground">Browse items from different Roblox games</p>
              </div>
            </div>

            <Tabs value={selectedGame} onValueChange={(value) => setSelectedGame(value as any)} className="w-full">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto">
                <TabsTrigger value="MM2" className="text-xs md:text-sm py-2 md:py-3">
                  Murder Mystery 2
                </TabsTrigger>
                <TabsTrigger value="SAB" className="text-xs md:text-sm py-2 md:py-3">
                  Steal A Brainrot
                </TabsTrigger>
                <TabsTrigger value="PVB" className="text-xs md:text-sm py-2 md:py-3">
                  Plants vs Brainrots
                </TabsTrigger>
                <TabsTrigger value="GAG" className="text-xs md:text-sm py-2 md:py-3">
                  Grow a Garden
                </TabsTrigger>
              </TabsList>

              <TabsContent value={selectedGame} className="space-y-6 mt-6">
                <Card className="p-4 md:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-xl md:text-2xl font-bold">{gameInfo[selectedGame].title}</h2>
                      <p className="text-sm text-muted-foreground">{gameInfo[selectedGame].description}</p>
                    </div>
                    {gameInfo[selectedGame].externalUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="hidden md:flex"
                      >
                        <a href={gameInfo[selectedGame].externalUrl} target="_blank" rel="noopener noreferrer">
                          <span className="flex items-center">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Visit Official Site
                          </span>
                        </a>
                      </Button>
                    )}
                  </div>

                  {/* Conversion Rate Display */}
                  <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border border-primary/20 rounded-lg p-3 md:p-4">
                    <div className="flex items-center justify-center gap-3">
                      <div className="text-center">
                        <p className="text-xs md:text-sm text-muted-foreground">Conversion Rate</p>
                        <p className="text-lg md:text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                          {gameInfo[selectedGame].conversionRate}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{gameInfo[selectedGame].source}</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Search Items</label>
                      <Input
                        placeholder="Search by name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Sort By</label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-md border bg-background text-foreground text-sm"
                      >
                        <option value="value-desc">Value (High to Low)</option>
                        <option value="value-asc">Value (Low to High)</option>
                        <option value="name">Name (A-Z)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Filter by Rarity</label>
                    <div className="flex flex-wrap gap-2">
                      {rarities.map((rarity) => (
                        <Badge
                          key={rarity}
                          variant={selectedRarity === rarity ? "default" : "outline"}
                          className={`cursor-pointer capitalize hover:scale-105 transition-transform text-xs ${
                            selectedRarity === rarity && rarity !== "all" ? getRarityColor(rarity) : ""
                          }`}
                          onClick={() => setSelectedRarity(rarity)}
                        >
                          {rarity} ({getRarityCount(rarity)})
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Showing {filteredItems.length} of {items.length} items
                  </div>
                </Card>

                {/* Items Grid */}
                {filteredItems.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 2xl:grid-cols-12 gap-2">
                    {filteredItems.map((item) => (
                      <Card key={item.id} className="p-2 hover:border-primary/50 transition-all">
                        <div className="space-y-1.5">
                          <div className="aspect-square bg-muted rounded-md flex items-center justify-center">
                            {item.image_url ? (
                              <img 
                                src={item.image_url} 
                                alt={item.name} 
                                className="w-full h-full object-cover rounded-md" 
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                            ) : null}
                            <Package className={`w-8 h-8 text-muted-foreground ${item.image_url ? 'hidden' : ''}`} />
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-1">
                              <h3 className="text-xs font-semibold truncate">{item.name}</h3>
                            </div>
                            
                            <Badge className={`${getRarityColor(item.rarity)} text-white text-[10px] px-1 py-0`}>
                              {item.rarity}
                            </Badge>
                            
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold">${item.value.toFixed(2)}</span>
                              {item.demand && (
                                <span className="text-[10px] text-muted-foreground">{item.demand}/10</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="p-8 md:p-12 text-center">
                    <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground mb-4">
                      {items.length === 0 
                        ? `No ${gameInfo[selectedGame].title} items in database yet.`
                        : "No items found matching your criteria"}
                    </p>
                    {gameInfo[selectedGame].externalUrl && items.length === 0 && (
                      <Button variant="outline" asChild>
                        <a href={gameInfo[selectedGame].externalUrl} target="_blank" rel="noopener noreferrer">
                          <span className="flex items-center">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            View on Official Site
                          </span>
                        </a>
                      </Button>
                    )}
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      <LiveChat />
      <MobileBottomNav />
    </div>
  );
};

export default Items;
