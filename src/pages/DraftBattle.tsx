import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { LiveChat } from "@/components/LiveChat";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Swords } from "lucide-react";
import draftBattleImg from "@/assets/draft-battle.jpg";

export default function DraftBattle() {
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
      
      <div className="flex-1 md:ml-64 md:mr-96">
        <TopBar />
        
        <main className="p-4 md:p-8 pt-20 md:pt-24">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="relative h-64 rounded-xl overflow-hidden border border-border shadow-glow">
              <img src={draftBattleImg} alt="Draft Battle" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
              <div className="absolute bottom-4 left-4">
                <h1 className="text-4xl font-bold text-foreground">Draft Battle</h1>
                <p className="text-muted-foreground">Coming Soon!</p>
              </div>
            </div>

            <Card className="p-8 border-border shadow-glow text-center">
              <Swords className="w-24 h-24 text-primary mx-auto mb-4 opacity-50" />
              <h2 className="text-2xl font-bold text-foreground mb-2">Under Development</h2>
              <p className="text-muted-foreground">
                This game mode is currently being developed. Check back soon!
              </p>
            </Card>
          </div>
        </main>
      </div>

      <LiveChat />
      
      <div className="h-20 md:hidden" />
    </div>
  );
}
