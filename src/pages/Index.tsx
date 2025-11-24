import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { LiveChat } from "@/components/LiveChat";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TrendingUp, Wallet, Gift } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="md:ml-64">
        <TopBar />
        <main className="container mx-auto px-4 py-8 pb-24 md:pb-8">
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="text-center space-y-4 py-12">
              <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Memecoin Paper Trading
              </h1>
              <p className="text-xl text-muted-foreground">
                Trade memecoins risk-free with virtual funds
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="p-6 hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate("/trading")}>
                <TrendingUp className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-bold mb-2">Start Trading</h3>
                <p className="text-muted-foreground">Trade popular memecoins with $10,000 virtual balance</p>
                <Button className="w-full mt-4">Go to Trading</Button>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate("/portfolio")}>
                <Wallet className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-bold mb-2">View Portfolio</h3>
                <p className="text-muted-foreground">Track your positions and trading performance</p>
                <Button className="w-full mt-4">View Portfolio</Button>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate("/giveaways")}>
                <Gift className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-bold mb-2">Solana Giveaways</h3>
                <p className="text-muted-foreground">Connect wallet and enter giveaways to win SOL</p>
                <Button className="w-full mt-4">Enter Giveaways</Button>
              </Card>
            </div>

            <Card className="p-6">
              <LiveChat />
            </Card>
          </div>
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
};

export default Index;
