import { useEffect, useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import { ParticleEffect } from "./ParticleEffect";

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
  const [showParticles, setShowParticles] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasTriggeredConfetti = useRef(false);

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

  // Trigger confetti and particles when animation completes for rare items
  useEffect(() => {
    if (!isSpinning && displayItems.length > 0 && !hasTriggeredConfetti.current) {
      const rarity = wonItem.rarity.toLowerCase();
      
      if (rarity === "chroma" || rarity === "godly" || rarity === "ancient") {
        hasTriggeredConfetti.current = true;
        setShowParticles(true);
        triggerRarityEffects(rarity);
        
        // Stop particles after animation
        setTimeout(() => setShowParticles(false), 3000);
      }
    }
  }, [isSpinning, wonItem, displayItems]);

  const triggerRarityEffects = (rarity: string) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = (rect.top + rect.height / 2) / window.innerHeight;

    if (rarity === "chroma") {
      // Epic rainbow confetti for Chroma
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const colors = ["#a855f7", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#ef4444"];

      const chromaConfetti = () => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) return;

        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x, y },
          colors: colors,
          startVelocity: 60,
          gravity: 1.2,
          scalar: 1.2,
        });

        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x, y },
          colors: colors,
          startVelocity: 60,
          gravity: 1.2,
          scalar: 1.2,
        });

        requestAnimationFrame(chromaConfetti);
      };

      chromaConfetti();

      // Add fireworks effect
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 160,
          origin: { x, y },
          colors: colors,
          startVelocity: 45,
          gravity: 0.8,
          ticks: 300,
        });
      }, 200);
    } else if (rarity === "godly") {
      // Fiery explosion for Godly
      const duration = 2500;
      const animationEnd = Date.now() + duration;
      const colors = ["#ef4444", "#f97316", "#fbbf24", "#ff0000"];

      const godlyConfetti = () => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) return;

        confetti({
          particleCount: 2,
          angle: 90,
          spread: 360,
          origin: { x, y },
          colors: colors,
          startVelocity: 40,
          gravity: 1,
          scalar: 1.5,
          shapes: ["circle"],
        });

        requestAnimationFrame(godlyConfetti);
      };

      godlyConfetti();

      // Explosion burst
      confetti({
        particleCount: 80,
        spread: 360,
        origin: { x, y },
        colors: colors,
        startVelocity: 50,
        gravity: 1.2,
        ticks: 250,
      });
    } else if (rarity === "ancient") {
      // Golden sparkles for Ancient
      const duration = 2000;
      const animationEnd = Date.now() + duration;
      const colors = ["#eab308", "#fbbf24", "#fde047", "#facc15"];

      const ancientConfetti = () => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) return;

        confetti({
          particleCount: 2,
          angle: 60,
          spread: 45,
          origin: { x, y: y - 0.1 },
          colors: colors,
          startVelocity: 35,
          gravity: 0.8,
          scalar: 0.8,
          shapes: ["star"],
        });

        confetti({
          particleCount: 2,
          angle: 120,
          spread: 45,
          origin: { x, y: y - 0.1 },
          colors: colors,
          startVelocity: 35,
          gravity: 0.8,
          scalar: 0.8,
          shapes: ["star"],
        });

        requestAnimationFrame(ancientConfetti);
      };

      ancientConfetti();

      // Star burst
      confetti({
        particleCount: 60,
        spread: 100,
        origin: { x, y },
        colors: colors,
        startVelocity: 40,
        gravity: 0.9,
        shapes: ["star"],
        ticks: 200,
      });
    }
  };

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
    <div 
      ref={containerRef}
      className="relative w-full overflow-hidden bg-gradient-to-b from-background to-secondary/20 rounded-lg p-6"
    >
      <ParticleEffect 
        rarity={wonItem.rarity} 
        active={showParticles} 
      />
      
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
          <div className="inline-block relative">
            <Badge
              className={cn(
                "text-lg px-4 py-2 bg-gradient-to-r animate-pulse",
                getRarityColor(wonItem.rarity),
                (wonItem.rarity.toLowerCase() === "chroma" || 
                 wonItem.rarity.toLowerCase() === "godly") && 
                "shadow-[0_0_30px_rgba(168,85,247,0.6)] animate-bounce"
              )}
            >
              Won: {wonItem.name} - ${wonItem.value.toFixed(2)}
            </Badge>
            {(wonItem.rarity.toLowerCase() === "chroma" || 
              wonItem.rarity.toLowerCase() === "godly" || 
              wonItem.rarity.toLowerCase() === "ancient") && (
              <div className="absolute inset-0 animate-ping">
                <Badge
                  className={cn(
                    "text-lg px-4 py-2 bg-gradient-to-r opacity-75",
                    getRarityColor(wonItem.rarity)
                  )}
                >
                  Won: {wonItem.name} - ${wonItem.value.toFixed(2)}
                </Badge>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
