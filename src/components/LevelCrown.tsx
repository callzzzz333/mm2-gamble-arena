import { Crown } from "lucide-react";
import { getLevelColor, getLevelGlowColor, getCrownType } from "@/lib/levelUtils";
import { cn } from "@/lib/utils";

interface LevelCrownProps {
  level: number;
  size?: "sm" | "md" | "lg";
  showLevel?: boolean;
}

export const LevelCrown = ({ level, size = "md", showLevel = true }: LevelCrownProps) => {
  const crownType = getCrownType(level);
  const color = getLevelColor(level);
  const glow = getLevelGlowColor(level);
  
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6"
  };

  const getCrownDecoration = () => {
    switch(crownType) {
      case "legendary":
        return (
          <div className="relative">
            <Crown className={cn(sizeClasses[size], color, glow, "animate-pulse")} strokeWidth={2.5} />
            {/* Diamond sparkles */}
            <div className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-red-400 rounded-full animate-ping" />
            <div className="absolute -bottom-0.5 -left-0.5 w-1 h-1 bg-pink-400 rounded-full animate-ping" style={{ animationDelay: "0.3s" }} />
          </div>
        );
      case "royal":
        return (
          <div className="relative">
            <Crown className={cn(sizeClasses[size], color, glow)} strokeWidth={2.5} />
            {/* Purple gems */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-purple-300 rounded-full" />
            <div className="absolute top-1/2 left-0 w-0.5 h-0.5 bg-violet-300 rounded-full" />
            <div className="absolute top-1/2 right-0 w-0.5 h-0.5 bg-violet-300 rounded-full" />
          </div>
        );
      case "noble":
        return (
          <div className="relative">
            <Crown className={cn(sizeClasses[size], color, glow)} strokeWidth={2} />
            {/* Blue sapphire */}
            <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-300 rounded-full" />
          </div>
        );
      case "elite":
        return (
          <div className="relative">
            <Crown className={cn(sizeClasses[size], color)} strokeWidth={2} />
            {/* Green emerald */}
            <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-0.5 h-0.5 bg-green-300 rounded-full" />
          </div>
        );
      default:
        return <Crown className={cn(sizeClasses[size], color)} strokeWidth={1.5} />;
    }
  };

  return (
    <div className="inline-flex items-center gap-1.5">
      {getCrownDecoration()}
      {showLevel && (
        <span className={cn("font-bold tabular-nums", color, size === "sm" ? "text-xs" : size === "md" ? "text-sm" : "text-base")}>
          {level}
        </span>
      )}
    </div>
  );
};