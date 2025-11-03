import { useNavigate, useLocation } from "react-router-dom";
import { Home, Trophy, DollarSign, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    setIsAdmin(!!data);
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="fixed left-0 top-0 bottom-0 w-16 bg-card border-r border-border flex flex-col items-center py-4 gap-2 z-50">
      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-4 cursor-pointer" onClick={() => navigate("/")}>
        <Trophy className="w-6 h-6" />
      </div>
      
      <Button 
        variant="ghost" 
        size="icon" 
        className={`hover:bg-accent ${isActive("/") ? "bg-accent" : ""}`}
        onClick={() => navigate("/")}
      >
        <Home className="w-5 h-5" />
      </Button>
      
      <Button 
        variant="ghost" 
        size="icon" 
        className={`hover:bg-accent ${isActive("/deposit") ? "bg-accent" : ""}`}
        onClick={() => navigate("/deposit")}
      >
        <DollarSign className="w-5 h-5" />
      </Button>
      
      {isAdmin && (
        <Button 
          variant="ghost" 
          size="icon" 
          className={`hover:bg-accent ${isActive("/admin") ? "bg-accent" : ""}`}
          onClick={() => navigate("/admin")}
        >
          <Shield className="w-5 h-5" />
        </Button>
      )}
      
      <div className="flex-1" />
    </div>
  );
};
