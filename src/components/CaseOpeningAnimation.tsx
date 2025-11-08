import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Item {
  id: string;
  name: string;
  value: number;
  rarity: string;
  image_url: string | null;
}

interface CaseOpeningAnimationProps {
  items: Item[];
  wonItem: Item;
  onComplete: () => void;
  playerName: string;
  position: number;
}

export const CaseOpeningAnimation = ({
  items,
  wonItem,
  onComplete,
  playerName,
  position,
}: CaseOpeningAnimationProps) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [displayItems, setDisplayItems] = useState<Item[]>([]);

  useEffect(() => {
    // Create a long array of random items with the won item at a specific position
    const itemPool = [...items];
    const spinItems: Item[] = [];
    
    // Add 50 random items before the winning item
    for (let i = 0; i < 50; i++) {
      spinItems.push(itemPool[Math.floor(Math.random() * itemPool.length)]);
    }
    
    // Add the winning item
    spinItems.push(wonItem);
    
    // Add 10 more items after
    for (let i = 0; i < 10; i++) {
      spinItems.push(itemPool[Math.floor(Math.random() * itemPool.length)]);
    }
    
    setDisplayItems(spinItems);
    
    // Start spinning after a brief delay
    setTimeout(() => {
      setIsSpinning(true);
    }, 100);

    // Stop spinning and show result
    const duration = 4000 + (position * 500); // Stagger animations by position
    setTimeout(() => {
      setIsSpinning(false);
      setTimeout(onComplete, 1000);
    }, duration);
  }, [items, wonItem, onComplete, position]);

  const getRarityColor = (rarity: string) => {
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

  const getRarityBorder = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case "chroma":
        return "border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.5)]";
      case "godly":
        return "border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.5)]";
      case "ancient":
        return "border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.5)]";
      case "legendary":
        return "border-purple-400 shadow-[0_0_15px_rgba(192,132,252,0.5)]";
      case "vintage":
        return "border-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.5)]";
      case "rare":
        return "border-green-400 shadow-[0_0_15px_rgba(74,222,128,0.5)]";
      default:
        return "border-gray-400";
    }
  };

  return (
    <div className="relative w-full overflow-hidden bg-gradient-to-b from-background to-secondary/20 rounded-lg p-6">
      <div className="text-center mb-4">
        <h3 className="text-lg font-bold text-primary">{playerName}</h3>
      </div>

      {/* Winning indicator line */}
      <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-primary/0 via-primary to-primary/0 z-10 pointer-events-none" />
      
      {/* Items container */}
      <div className="relative h-48 overflow-hidden">
        <div
          className={cn(
            "flex gap-4 absolute left-1/2 transition-transform",
            isSpinning && "ease-out"
          )}
          style={{
            transform: isSpinning
              ? `translateX(calc(-50% - ${(displayItems.length - 11) * 160}px))`
              : "translateX(-50%)",
            transitionDuration: isSpinning ? "4000ms" : "0ms",
          }}
        >
          {displayItems.map((item, index) => (
            <Card
              key={`${item.id}-${index}`}
              className={cn(
                "flex-shrink-0 w-36 h-44 p-3 flex flex-col items-center justify-between transition-all duration-300 border-2",
                index === displayItems.length - 11 && !isSpinning
                  ? getRarityBorder(item.rarity)
                  : "border-border"
              )}
            >
              <div className="w-full h-24 flex items-center justify-center">
                <img
                  src={item.image_url || "/placeholder.svg"}
                  alt={item.name}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <div className="w-full text-center space-y-1">
                <p className="text-xs font-medium truncate">{item.name}</p>
                <Badge
                  className={cn(
                    "text-xs w-full bg-gradient-to-r",
                    getRarityColor(item.rarity)
                  )}
                >
                  {item.rarity}
                </Badge>
                <p className="text-sm font-bold text-primary">
                  ${item.value.toFixed(2)}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Result display */}
      {!isSpinning && (
        <div className="mt-6 animate-fade-in text-center">
          <div className="inline-block">
            <Badge
              className={cn(
                "text-lg px-4 py-2 bg-gradient-to-r",
                getRarityColor(wonItem.rarity)
              )}
            >
              Won: {wonItem.name} - ${wonItem.value.toFixed(2)}
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
};
