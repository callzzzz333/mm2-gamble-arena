import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Deposit from "./pages/Deposit";
import Withdraw from "./pages/Withdraw";
import Market from "./pages/Market";
import CreateListing from "./pages/CreateListing";
import MyListings from "./pages/MyListings";
import Admin from "./pages/Admin";
import Items from "./pages/Items";
import Inventory from "./pages/Inventory";
import Leaderboard from "./pages/Leaderboard";
import Rewards from "./pages/Rewards";
import Roulette from "./pages/Roulette";
import Crash from "./pages/Crash";
import Coinflip from "./pages/Coinflip";
import Jackpot from "./pages/Jackpot";
import Upgrader from "./pages/Upgrader";
import CaseBattles from "./pages/CaseBattles";
import DraftBattle from "./pages/DraftBattle";
import ItemDuel from "./pages/ItemDuel";
import KingOfHill from "./pages/KingOfHill";
import TeamShowdown from "./pages/TeamShowdown";
import RussianRoulette from "./pages/RussianRoulette";
import ChristmasRaffle from "./pages/ChristmasRaffle";
import Giveaways from "./pages/Giveaways";
import FAQ from "./pages/FAQ";
import Socials from "./pages/Socials";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/deposit" element={<Deposit />} />
          <Route path="/withdraw" element={<Withdraw />} />
          <Route path="/market" element={<Market />} />
          <Route path="/create-listing" element={<CreateListing />} />
          <Route path="/my-listings" element={<MyListings />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/items" element={<Items />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/rewards" element={<Rewards />} />
          <Route path="/roulette" element={<Roulette />} />
          <Route path="/crash" element={<Crash />} />
          <Route path="/coinflip" element={<Coinflip />} />
          <Route path="/jackpot" element={<Jackpot />} />
          <Route path="/upgrader" element={<Upgrader />} />
          <Route path="/case-battles" element={<CaseBattles />} />
          <Route path="/draft-battle" element={<DraftBattle />} />
          <Route path="/item-duel" element={<ItemDuel />} />
          <Route path="/king-of-hill" element={<KingOfHill />} />
          <Route path="/team-showdown" element={<TeamShowdown />} />
          <Route path="/russian-roulette" element={<RussianRoulette />} />
          <Route path="/christmas-raffle" element={<ChristmasRaffle />} />
          <Route path="/giveaways" element={<Giveaways />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/socials" element={<Socials />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
