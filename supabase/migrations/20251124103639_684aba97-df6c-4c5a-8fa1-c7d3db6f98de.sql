-- Create paper trading portfolios table
CREATE TABLE public.paper_portfolios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Main Portfolio',
  balance DECIMAL NOT NULL DEFAULT 10000.00,
  total_value DECIMAL NOT NULL DEFAULT 10000.00,
  total_profit_loss DECIMAL NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create paper trading positions table
CREATE TABLE public.paper_positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID NOT NULL REFERENCES public.paper_portfolios(id) ON DELETE CASCADE,
  token_address TEXT NOT NULL,
  token_symbol TEXT NOT NULL,
  token_name TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  average_buy_price DECIMAL NOT NULL,
  current_price DECIMAL NOT NULL DEFAULT 0,
  profit_loss DECIMAL NOT NULL DEFAULT 0,
  profit_loss_percentage DECIMAL NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create paper trading history table
CREATE TABLE public.paper_trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID NOT NULL REFERENCES public.paper_portfolios(id) ON DELETE CASCADE,
  token_address TEXT NOT NULL,
  token_symbol TEXT NOT NULL,
  token_name TEXT NOT NULL,
  trade_type TEXT NOT NULL CHECK (trade_type IN ('buy', 'sell')),
  amount DECIMAL NOT NULL,
  price DECIMAL NOT NULL,
  total_value DECIMAL NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create Solana giveaways table
CREATE TABLE public.solana_giveaways (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  prize_amount DECIMAL NOT NULL,
  prize_token TEXT NOT NULL DEFAULT 'SOL',
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  winner_id UUID,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE
);

-- Create giveaway entries table
CREATE TABLE public.solana_giveaway_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  giveaway_id UUID NOT NULL REFERENCES public.solana_giveaways(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  wallet_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(giveaway_id, user_id)
);

-- Enable RLS
ALTER TABLE public.paper_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paper_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paper_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solana_giveaways ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solana_giveaway_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for portfolios
CREATE POLICY "Users can view their own portfolios"
  ON public.paper_portfolios FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own portfolios"
  ON public.paper_portfolios FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own portfolios"
  ON public.paper_portfolios FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for positions
CREATE POLICY "Users can view their own positions"
  ON public.paper_positions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.paper_portfolios
      WHERE paper_portfolios.id = paper_positions.portfolio_id
      AND paper_portfolios.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create positions in their portfolios"
  ON public.paper_positions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.paper_portfolios
      WHERE paper_portfolios.id = portfolio_id
      AND paper_portfolios.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own positions"
  ON public.paper_positions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.paper_portfolios
      WHERE paper_portfolios.id = paper_positions.portfolio_id
      AND paper_portfolios.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own positions"
  ON public.paper_positions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.paper_portfolios
      WHERE paper_portfolios.id = paper_positions.portfolio_id
      AND paper_portfolios.user_id = auth.uid()
    )
  );

-- RLS Policies for trades
CREATE POLICY "Users can view their own trades"
  ON public.paper_trades FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.paper_portfolios
      WHERE paper_portfolios.id = paper_trades.portfolio_id
      AND paper_portfolios.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create trades in their portfolios"
  ON public.paper_trades FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.paper_portfolios
      WHERE paper_portfolios.id = portfolio_id
      AND paper_portfolios.user_id = auth.uid()
    )
  );

-- RLS Policies for giveaways
CREATE POLICY "Everyone can view active giveaways"
  ON public.solana_giveaways FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create giveaways"
  ON public.solana_giveaways FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their giveaways"
  ON public.solana_giveaways FOR UPDATE
  USING (auth.uid() = creator_id);

-- RLS Policies for giveaway entries
CREATE POLICY "Users can view all giveaway entries"
  ON public.solana_giveaway_entries FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own entries"
  ON public.solana_giveaway_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_paper_portfolios_user_id ON public.paper_portfolios(user_id);
CREATE INDEX idx_paper_positions_portfolio_id ON public.paper_positions(portfolio_id);
CREATE INDEX idx_paper_trades_portfolio_id ON public.paper_trades(portfolio_id);
CREATE INDEX idx_solana_giveaways_status ON public.solana_giveaways(status);
CREATE INDEX idx_solana_giveaway_entries_giveaway_id ON public.solana_giveaway_entries(giveaway_id);

-- Create updated_at trigger
CREATE TRIGGER update_paper_portfolios_updated_at
  BEFORE UPDATE ON public.paper_portfolios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_paper_positions_updated_at
  BEFORE UPDATE ON public.paper_positions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();