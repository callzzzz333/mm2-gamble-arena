import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface GameModeCardProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  isNew?: boolean;
  comingSoon?: boolean;
  route?: string;
  image?: string;
}

export const GameModeCard = ({ title, subtitle, icon: Icon, isNew, comingSoon, route, image }: GameModeCardProps) => {
  const navigate = useNavigate();

  const handlePlayClick = () => {
    if (!comingSoon && route) {
      navigate(route);
    }
  };

  return (
    <div className="group relative bg-card rounded-xl border border-border overflow-hidden transition-all duration-300 hover:border-primary/50 hover:shadow-glow min-w-[300px]">
      <div className="relative h-full">
        {isNew && (
          <Badge className="absolute top-3 right-3 z-10 bg-primary text-primary-foreground">
            NEW
          </Badge>
        )}
        {comingSoon && (
          <Badge className="absolute top-3 right-3 z-10 bg-muted text-muted-foreground">
            SOON
          </Badge>
        )}
        
        {image ? (
          <div className="relative h-48 overflow-hidden">
            <img 
              src={image} 
              alt={title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
          </div>
        ) : (
          <div className="flex items-center justify-center h-48 py-8">
            <Icon className="w-16 h-16 text-primary/60 group-hover:text-primary transition-colors" />
          </div>
        )}
        
        <div className="p-6 space-y-4">
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
          
          <Button 
            className="w-full bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/20 hover:border-primary transition-all"
            disabled={comingSoon}
            onClick={handlePlayClick}
          >
            {comingSoon ? "Coming Soon" : "Play Now"}
          </Button>
        </div>
      </div>
    </div>
  );
};
