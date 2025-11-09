import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { GameModeCard } from "@/components/GameModeCard";
import { LiveBets } from "@/components/LiveBets";
import { LiveChat } from "@/components/LiveChat";
import { Coins, Trophy, TrendingUp, CircleDot, Rocket } from "lucide-react";
import discordBanner from "@/assets/discord-banner.png";
import coinflipImg from "@/assets/coinflip.png";
import jackpotImg from "@/assets/jackpot.png";

const Index = () => {
  return (
    <div className="min-h-screen w-full flex">
      <Sidebar />
      
      <div className="flex-1 ml-64 mr-96">
        <TopBar />
        
        <main className="pt-16">
          {/* Discord Banner with Rounded Corners */}
          <section className="px-12 py-6">
            <div 
              className="relative h-64 overflow-hidden rounded-2xl cursor-pointer transition-transform hover:scale-[1.02] duration-300"
              onClick={() => window.open('https://discord.gg/xBbrVPsPqs', '_blank')}
            >
              <img 
                src={discordBanner}
                alt="Join our Discord - Daily Giveaways & Airdrops"
                className="absolute inset-0 w-full h-full object-cover"
              />
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
              <GameModeCard
                title="UPGRADER"
                subtitle="RBXROYALE ORIGINALS"
                icon={TrendingUp}
                isNew
                route="/upgrader"
                image={coinflipImg}
              />
              <GameModeCard
                title="ROULETTE"
                subtitle="RBXROYALE ORIGINALS"
                icon={CircleDot}
                isNew
                route="/roulette"
                image={jackpotImg}
              />
              <GameModeCard
                title="CRASH"
                subtitle="RBXROYALE ORIGINALS"
                icon={Rocket}
                isNew
                route="/crash"
                image={coinflipImg}
              />
              <GameModeCard
                title="CASE BATTLES"
                subtitle="RBXROYALE ORIGINALS"
                icon={Trophy}
                isNew
                route="/case-battles"
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
