import { useState, useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { LiveChat } from "@/components/LiveChat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { ExternalLink } from "lucide-react";

const Deposit = () => {
  const [user, setUser] = useState<any>(null);
  const [privateServerLink, setPrivateServerLink] = useState("");
  const [traderUsername, setTraderUsername] = useState("MM2PVP_Trader");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        navigate("/auth");
      } else {
        setUser(user);
      }
    });
  }, [navigate]);

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      const { error } = await supabase.from("deposits").insert({
        user_id: profile.id,
        private_server_link: privateServerLink,
        trader_username: traderUsername,
        status: "pending",
      });

      if (error) throw error;

      toast({
        title: "Deposit request submitted!",
        description: "An admin will review your deposit shortly",
      });

      setPrivateServerLink("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit deposit",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex">
      <Sidebar />
      
      <div className="flex-1 ml-16 mr-96">
        <TopBar />
        
        <main className="pt-16 px-12 py-12">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-4xl font-bold mb-2">Deposit Items</h1>
            <p className="text-muted-foreground mb-8">
              Join a private server and trade your MM2 items to add them to your balance
            </p>

            <Card className="p-6 bg-card border-border mb-6">
              <h2 className="text-xl font-bold mb-4">How to Deposit</h2>
              <ol className="space-y-3 text-muted-foreground">
                <li className="flex gap-2">
                  <span className="text-primary font-bold">1.</span>
                  <span>Create a Roblox private server or use an existing one</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-bold">2.</span>
                  <span>Copy the private server link</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-bold">3.</span>
                  <span>Paste the link below and submit</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-bold">4.</span>
                  <span>Trade your items to <strong className="text-primary">{traderUsername}</strong> in the server</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-primary font-bold">5.</span>
                  <span>An admin will verify and add items to your account</span>
                </li>
              </ol>
            </Card>

            <Card className="p-6 bg-card border-border">
              <form onSubmit={handleDeposit} className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">
                    Private Server Link
                  </label>
                  <Input
                    type="url"
                    value={privateServerLink}
                    onChange={(e) => setPrivateServerLink(e.target.value)}
                    placeholder="https://www.roblox.com/games/..."
                    required
                    className="bg-background"
                  />
                </div>

                <div>
                  <label className="text-sm font-semibold text-foreground mb-2 block">
                    Trader Username
                  </label>
                  <Input
                    type="text"
                    value={traderUsername}
                    onChange={(e) => setTraderUsername(e.target.value)}
                    className="bg-background"
                    disabled
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Trade your items to this username in the private server
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90"
                  disabled={loading}
                >
                  {loading ? "Submitting..." : "Submit Deposit Request"}
                  <ExternalLink className="w-4 h-4 ml-2" />
                </Button>
              </form>
            </Card>
          </div>
        </main>
      </div>

      <LiveChat />
    </div>
  );
};

export default Deposit;
