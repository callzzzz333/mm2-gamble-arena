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
import Coinflip from "./pages/Coinflip";
import Jackpot from "./pages/Jackpot";
import Items from "./pages/Items";
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
          <Route path="/coinflip" element={<Coinflip />} />
          <Route path="/jackpot" element={<Jackpot />} />
          <Route path="/items" element={<Items />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
