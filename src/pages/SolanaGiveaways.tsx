import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Gift, Clock, Users, Trophy } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function SolanaGiveaways() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { publicKey, connected } = useWallet();
  const [giveaways, setGiveaways] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchGiveaways();
  }, [user, navigate]);

  const fetchGiveaways = async () => {
    const { data } = await supabase
      .from('solana_giveaways')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (data) setGiveaways(data);
    setLoading(false);
  };

  const handleEnterGiveaway = async (giveawayId: string) => {
    if (!connected || !publicKey) {
      toast.error("Please connect your Solana wallet first");
      return;
    }

    if (!user) return;

    const { error } = await supabase
      .from('solana_giveaway_entries')
      .insert({
        giveaway_id: giveawayId,
        user_id: user.id,
        wallet_address: publicKey.toString(),
      });

    if (error) {
      if (error.code === '23505') {
        toast.error("You've already entered this giveaway");
      } else {
        toast.error("Failed to enter giveaway");
      }
    } else {
      toast.success("Successfully entered giveaway!");
      fetchGiveaways();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="md:ml-64">
        <TopBar />
        <main className="container mx-auto px-4 py-8 pb-24 md:pb-8">
          <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Solana Giveaways
                </h1>
                <p className="text-muted-foreground">Win SOL and other tokens</p>
              </div>
              <WalletMultiButton />
            </div>

            {/* Wallet Connection Status */}
            {!connected && (
              <Card className="p-6 bg-yellow-500/10 border-yellow-500/20">
                <div className="flex items-center gap-3">
                  <Gift className="h-6 w-6 text-yellow-500" />
                  <div>
                    <p className="font-semibold">Connect Your Wallet</p>
                    <p className="text-sm text-muted-foreground">
                      Connect your Solana wallet to enter giveaways
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Giveaways Grid */}
            {loading ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">Loading giveaways...</p>
              </Card>
            ) : giveaways.length === 0 ? (
              <Card className="p-12 text-center">
                <Gift className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-xl font-semibold mb-2">No Active Giveaways</p>
                <p className="text-muted-foreground">Check back soon for new giveaways!</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {giveaways.map((giveaway) => (
                  <Card key={giveaway.id} className="p-6 hover:shadow-lg transition-all">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Trophy className="h-8 w-8 text-primary" />
                        <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-semibold rounded">
                          ACTIVE
                        </span>
                      </div>

                      <div>
                        <h3 className="text-xl font-bold mb-2">{giveaway.title}</h3>
                        {giveaway.description && (
                          <p className="text-sm text-muted-foreground">{giveaway.description}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <span className="text-sm text-muted-foreground">Prize</span>
                          <span className="font-bold text-primary">
                            {parseFloat(giveaway.prize_amount).toFixed(2)} {giveaway.prize_token}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>
                            Ends {new Date(giveaway.ends_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <Button
                        className="w-full"
                        onClick={() => handleEnterGiveaway(giveaway.id)}
                        disabled={!connected}
                      >
                        {connected ? 'Enter Giveaway' : 'Connect Wallet to Enter'}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
