import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { GameModeCard } from "@/components/GameModeCard";
import { LiveBets } from "@/components/LiveBets";
import { LiveChat } from "@/components/LiveChat";
import { Button } from "@/components/ui/button";
import { Coins, Trophy } from "lucide-react";
import coinflipImg from "@/assets/coinflip.png";
import jackpotImg from "@/assets/jackpot.png";

const Index = () => {
  return (
    <div className="min-h-screen w-full flex">
      <Sidebar />
      
      <div className="flex-1 ml-64 mr-96">
        <TopBar />
        
        <main className="pt-16">
          {/* Hero Section with Discord Link */}
          <section className="relative px-12 py-8 bg-gradient-to-br from-card to-muted/50 border-b border-border">
            <div className="max-w-6xl mx-auto text-center space-y-4">
              <h1 className="text-4xl md:text-5xl font-bold text-foreground">
                Welcome to <span className="text-primary">RBXROYALE</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                The ultimate Roblox item betting platform. Play Coinflip, Jackpot, and more!
              </p>
              <Button 
                size="lg" 
                className="bg-[hsl(235,86%,65%)] hover:bg-[hsl(235,86%,60%)] text-white font-semibold shadow-lg"
                onClick={() => window.open('https://discord.gg/xBbrVPsPqs', '_blank')}
              >
                Join Discord for Giveaways
              </Button>
            </div>
          </section>

          {/* Game Modes */}
          <section className="px-12 py-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Trophy className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold">Game Modes</h2>
            </div>

            <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
              <GameModeCard
                title="COINFLIP"
                subtitle="RBXROYALE ORIGINALS"
                icon={Coins}
                isNew
                route="/coinflip"
                image={coinflipImg}
              />
              <GameModeCard
                title="JACKPOT"
                subtitle="RBXROYALE ORIGINALS"
                icon={Trophy}
                isNew
                route="/jackpot"
                image={jackpotImg}
              />
            </div>
          </section>

          {/* Live Bets */}
          <section className="px-12 pb-12">
            <LiveBets />
          </section>
        </main>
      </div>

      <LiveChat />
    </div>
  );
};

export default Index;
