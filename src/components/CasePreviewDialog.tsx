import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Package, Sparkles } from "lucide-react";

interface Item {
  id: string;
  name: string;
  rarity: string;
  value: number;
  image_url: string | null;
  drop_chance?: number;
}

interface CasePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  crateId: string | null;
  crateName: string;
}

export const CasePreviewDialog = ({ 
  open, 
  onOpenChange, 
  crateId,
  crateName
}: CasePreviewDialogProps) => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && crateId) {
      fetchCrateItems();
    }
  }, [open, crateId]);

  const fetchCrateItems = async () => {
    if (!crateId) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("crate_items")
      .select(`
        drop_chance,
        items (
          id,
          name,
          rarity,
          value,
          image_url
        )
      `)
      .eq("crate_id", crateId)
      .order("drop_chance", { ascending: false });

    if (data) {
      const itemsData = data.map((ci: any) => ({
        ...ci.items,
        drop_chance: ci.drop_chance
      }));
      setItems(itemsData);
    }
    setLoading(false);
  };

  const getRarityColor = (rarity: string) => {
    const colors: Record<string, string> = {
      common: "bg-slate-500",
      uncommon: "bg-green-500",
      rare: "bg-blue-500",
      epic: "bg-purple-500",
      legendary: "bg-yellow-500",
      godly: "bg-red-500",
      ancient: "bg-orange-500",
      chroma: "bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500"
    };
    return colors[rarity.toLowerCase()] || "bg-gray-500";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <Sparkles className="w-7 h-7 text-primary" />
            {crateName} - Preview
            <span className="text-sm text-muted-foreground ml-auto">
              {items.length} items available
            </span>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[600px] pr-4">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading case items...
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No items found in this case</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {items.map((item) => (
                <Card
                  key={item.id}
                  className="p-4 transition-all hover:shadow-glow hover:border-primary border-border group relative"
                >
                  <div className="aspect-square bg-card-hover rounded-lg mb-3 flex items-center justify-center overflow-hidden border border-border relative">
                    {item.image_url ? (
                      <img 
                        src={item.image_url} 
                        alt={item.name}
                        className="w-full h-full object-contain group-hover:scale-110 transition-transform"
                      />
                    ) : (
                      <Package className="w-12 h-12 text-muted-foreground" />
                    )}
                    {item.drop_chance && (
                      <Badge className="absolute top-2 right-2 bg-background/80 text-foreground text-xs">
                        {item.drop_chance.toFixed(2)}%
                      </Badge>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm text-foreground truncate" title={item.name}>
                      {item.name}
                    </h3>
                    
                    <div className="flex items-center justify-between gap-2">
                      <Badge className={`${getRarityColor(item.rarity)} text-white text-xs truncate flex-1`}>
                        {item.rarity}
                      </Badge>
                      <span className="text-primary font-bold text-sm whitespace-nowrap">
                        ${item.value.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};