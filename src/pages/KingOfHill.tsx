import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { LiveChat } from "@/components/LiveChat";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Crown } from "lucide-react";
import kingOfHillImg from "@/assets/king-of-hill.jpg";

export default function KingOfHill() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    setUser(user);
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      
      <div className="flex-1 ml-64 mr-96">
        <TopBar />
        
        <main className="p-8 pt-24">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="relative h-64 rounded-xl overflow-hidden border border-border shadow-glow">
              <img src={kingOfHillImg} alt="King of the Hill" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
              <div className="absolute bottom-4 left-4">
                <h1 className="text-4xl font-bold text-foreground">King of the Hill</h1>
                <p className="text-muted-foreground">Coming Soon!</p>
              </div>
            </div>

            <Card className="p-8 border-border shadow-glow text-center">
              <Crown className="w-24 h-24 text-primary mx-auto mb-4 opacity-50" />
              <h2 className="text-2xl font-bold text-foreground mb-2">Under Development</h2>
              <p className="text-muted-foreground">
                This game mode is currently being developed. Check back soon!
              </p>
            </Card>
          </div>
        </main>
      </div>

      <LiveChat />
    </div>
  );
}
