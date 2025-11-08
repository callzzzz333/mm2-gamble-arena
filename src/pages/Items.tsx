import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { LiveChat } from "@/components/LiveChat";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Package } from "lucide-react";

interface Item {
  id: string;
  name: string;
  rarity: string;
  value: number;
  image_url: string | null;
}

const Items = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRarity, setSelectedRarity] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"value-desc" | "value-asc" | "name">("value-desc");

  useEffect(() => {
    fetchItems();
  }, []);

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

  return (
    <div className="min-h-screen w-full flex">
      <Sidebar />
      
      <div className="flex-1 ml-64 mr-96">
        <TopBar />
        
        <main className="pt-16 px-12 py-8">
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-glow">
                <Package className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">MM2 Items</h1>
                <p className="text-muted-foreground">All Murder Mystery 2 items with USD values</p>
              </div>
            </div>

            {/* Filters */}
            <Card className="p-6">
              <div className="space-y-4">
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
                      className="w-full px-3 py-2 rounded-md border bg-background text-foreground"
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
                        className={`cursor-pointer capitalize hover:scale-105 transition-transform ${
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
              </div>
            </Card>

            {/* Items Grid */}
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
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {filteredItems.length === 0 && (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">No items found matching your criteria</p>
              </Card>
            )}
          </div>
        </main>
      </div>

      <LiveChat />
    </div>
  );
};

export default Items;
