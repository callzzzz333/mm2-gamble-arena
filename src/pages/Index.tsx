import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { GameModeCard } from "@/components/GameModeCard";
import { LiveBets } from "@/components/LiveBets";
import { LiveChat } from "@/components/LiveChat";
import { Button } from "@/components/ui/button";
import { Coins, Trophy, Users } from "lucide-react";
import discordBanner from "@/assets/discord-banner.png";

const Index = () => {
  return (
    <div className="min-h-screen w-full flex">
      <Sidebar />
      
      <div className="flex-1 ml-64 mr-96">
        <TopBar />
        
        <main className="pt-16">
          {/* Discord Banner */}
          <section className="relative h-64 overflow-hidden cursor-pointer" onClick={() => window.open('https://discord.gg/xBbrVPsPqs', '_blank')}>
            <img 
              src={discordBanner}
              alt="Join our Discord - Daily Giveaways & Airdrops"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </section>

          {/* Game Modes */}
          <section className="px-12 py-12">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Trophy className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold">Game Modes</h2>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              <GameModeCard
                title="COINFLIP"
                subtitle="MM2 PVP Originals"
                icon={Coins}
                isNew
                route="/coinflip"
              />
              <GameModeCard
                title="JACKPOT"
                subtitle="MM2 PVP Originals"
                icon={Trophy}
                isNew
                route="/jackpot"
              />
              <GameModeCard
                title="TEAM SHOWDOWN"
                subtitle="MM2 PVP Originals"
                icon={Users}
                comingSoon
                route="/team-showdown"
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
