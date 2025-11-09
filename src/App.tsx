import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Deposit from "./pages/Deposit";
import Withdraw from "./pages/Withdraw";
import Admin from "./pages/Admin";
import Inventory from "./pages/Inventory";
import Coinflip from "./pages/Coinflip";
import Jackpot from "./pages/Jackpot";
import Items from "./pages/Items";
import RussianRoulette from "./pages/RussianRoulette";
import KingOfHill from "./pages/KingOfHill";
import DraftBattle from "./pages/DraftBattle";
import TeamShowdown from "./pages/TeamShowdown";
import ItemDuel from "./pages/ItemDuel";
import Leaderboard from "./pages/Leaderboard";
import Rewards from "./pages/Rewards";
import ChristmasRaffle from "./pages/ChristmasRaffle";
import Upgrader from "./pages/Upgrader";
import BlackjackDuel from "./pages/BlackjackDuel";
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
          <Route path="/auth" element={<Auth />} />
          <Route path="/deposit" element={<Deposit />} />
          <Route path="/withdraw" element={<Withdraw />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/coinflip" element={<Coinflip />} />
          <Route path="/jackpot" element={<Jackpot />} />
          <Route path="/items" element={<Items />} />
          <Route path="/russian-roulette" element={<RussianRoulette />} />
          <Route path="/king-of-hill" element={<KingOfHill />} />
          <Route path="/draft-battle" element={<DraftBattle />} />
          <Route path="/team-showdown" element={<TeamShowdown />} />
          <Route path="/item-duel" element={<ItemDuel />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/rewards" element={<Rewards />} />
          <Route path="/christmas-raffle" element={<ChristmasRaffle />} />
          <Route path="/upgrader" element={<Upgrader />} />
          <Route path="/blackjack-duel" element={<BlackjackDuel />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
