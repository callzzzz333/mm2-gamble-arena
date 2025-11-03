import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface GameModeCardProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  isNew?: boolean;
  comingSoon?: boolean;
}

export const GameModeCard = ({ title, subtitle, icon: Icon, isNew, comingSoon }: GameModeCardProps) => {
  return (
    <div className="group relative bg-card rounded-xl border border-border overflow-hidden transition-all duration-300 hover:border-primary/50 hover:shadow-glow min-w-[240px]">
      <div className="p-6 flex flex-col gap-4 h-full">
        {isNew && (
          <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground">
            NEW
          </Badge>
        )}
        {comingSoon && (
          <Badge className="absolute top-3 right-3 bg-muted text-muted-foreground">
            SOON
          </Badge>
        )}
        
        <div className="flex-1 flex items-center justify-center py-8">
          <Icon className="w-16 h-16 text-primary/60 group-hover:text-primary transition-colors" />
        </div>
        
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        
        <Button 
          className="w-full bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/20 hover:border-primary transition-all"
          disabled={comingSoon}
        >
          {comingSoon ? "Coming Soon" : "Play Now"}
        </Button>
      </div>
    </div>
  );
};
