import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { GameModeCard } from "@/components/GameModeCard";
import { LiveBets } from "@/components/LiveBets";
import { LiveChat } from "@/components/LiveChat";
import { Button } from "@/components/ui/button";
import { Coins, Trophy, Dices, Zap } from "lucide-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import heroBanner from "@/assets/hero-banner.jpg";

const Index = () => {
  return (
    <div className="min-h-screen w-full flex">
      <Sidebar />
      
      <div className="flex-1 ml-16 mr-96">
        <TopBar />
        
        <main className="pt-16">
          {/* Hero Banner */}
          <section className="relative h-64 overflow-hidden">
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${heroBanner})` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/60 to-transparent" />
            </div>
            
            <div className="relative h-full flex items-center px-12">
              <div className="max-w-2xl space-y-4">
                <div className="inline-block px-3 py-1 bg-primary/20 text-primary border border-primary/30 rounded-full text-sm font-semibold">
                  🎉 PVP Battle Mode is Live!
                </div>
                <h1 className="text-4xl md:text-5xl font-bold">
                  Wager Your MM2 Items
                </h1>
                <p className="text-lg text-muted-foreground">
                  Battle other players in exciting PVP matches. Coinflip, Jackpot, and 1v1 battles!
                </p>
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-glow">
                  Start Playing Now
                </Button>
              </div>
            </div>
          </section>

          {/* Game Modes */}
          <section className="px-12 py-12">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Dices className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-bold">Game Modes</h2>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm">
                  See All
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              <GameModeCard
                title="COINFLIP"
                subtitle="MM2 PVP Originals"
                icon={Coins}
                isNew
              />
              <GameModeCard
                title="JACKPOT"
                subtitle="MM2 PVP Originals"
                icon={Trophy}
                isNew
              />
              <GameModeCard
                title="UPGRADER"
                subtitle="MM2 PVP Originals"
                icon={Zap}
              />
              <GameModeCard
                title="DICE DUEL"
                subtitle="MM2 PVP Originals"
                icon={Dices}
                comingSoon
              />
              <GameModeCard
                title="MYSTERY BOX"
                subtitle="MM2 PVP Originals"
                icon={Trophy}
                comingSoon
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
