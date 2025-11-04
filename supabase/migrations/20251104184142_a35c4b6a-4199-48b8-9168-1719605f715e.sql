-- Add balance to profiles
ALTER TABLE public.profiles ADD COLUMN balance DECIMAL(10,2) DEFAULT 0.00 NOT NULL;

-- Create games table for coinflip
CREATE TABLE public.coinflip_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joiner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  bet_amount DECIMAL(10,2) NOT NULL CHECK (bet_amount > 0),
  creator_side TEXT NOT NULL CHECK (creator_side IN ('heads', 'tails')),
  winner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  result TEXT CHECK (result IN ('heads', 'tails')),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create jackpot games table
CREATE TABLE public.jackpot_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_pot DECIMAL(10,2) DEFAULT 0.00 NOT NULL,
  winner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'rolling', 'completed')),
  draw_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create jackpot entries table
CREATE TABLE public.jackpot_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.jackpot_games(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bet_amount DECIMAL(10,2) NOT NULL CHECK (bet_amount > 0),
  win_chance DECIMAL(5,2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transactions table for tracking balance changes
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'win', 'loss', 'admin_credit')),
  game_type TEXT CHECK (game_type IN ('coinflip', 'jackpot', 'upgrader', 'dice', 'mystery')),
  game_id UUID,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.coinflip_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jackpot_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jackpot_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for coinflip_games
CREATE POLICY "Coinflip games are viewable by everyone"
  ON public.coinflip_games FOR SELECT
  USING (true);

CREATE POLICY "Users can create coinflip games"
  ON public.coinflip_games FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update coinflip games they're part of"
  ON public.coinflip_games FOR UPDATE
  USING (auth.uid() = creator_id OR auth.uid() = joiner_id);

-- RLS Policies for jackpot_games
CREATE POLICY "Jackpot games are viewable by everyone"
  ON public.jackpot_games FOR SELECT
  USING (true);

CREATE POLICY "Only system can create jackpot games"
  ON public.jackpot_games FOR INSERT
  WITH CHECK (false);

-- RLS Policies for jackpot_entries
CREATE POLICY "Jackpot entries are viewable by everyone"
  ON public.jackpot_entries FOR SELECT
  USING (true);

CREATE POLICY "Users can create jackpot entries"
  ON public.jackpot_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for transactions
CREATE POLICY "Users can view own transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all transactions"
  ON public.transactions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_coinflip_status ON public.coinflip_games(status);
CREATE INDEX idx_jackpot_status ON public.jackpot_games(status);
CREATE INDEX idx_jackpot_entries_game ON public.jackpot_entries(game_id);
CREATE INDEX idx_transactions_user ON public.transactions(user_id);

-- Enable realtime for games
ALTER PUBLICATION supabase_realtime ADD TABLE public.coinflip_games;
ALTER PUBLICATION supabase_realtime ADD TABLE public.jackpot_games;
ALTER PUBLICATION supabase_realtime ADD TABLE public.jackpot_entries;

-- Update profiles RLS to allow balance updates
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

-- Function to safely update balance
CREATE OR REPLACE FUNCTION public.update_user_balance(
  p_user_id UUID,
  p_amount DECIMAL,
  p_type TEXT,
  p_game_type TEXT DEFAULT NULL,
  p_game_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance DECIMAL;
BEGIN
  -- Get current balance
  SELECT balance INTO current_balance
  FROM public.profiles
  WHERE id = p_user_id;

  -- Check if balance would go negative
  IF (current_balance + p_amount) < 0 THEN
    RETURN FALSE;
  END IF;

  -- Update balance
  UPDATE public.profiles
  SET balance = balance + p_amount
  WHERE id = p_user_id;

  -- Record transaction
  INSERT INTO public.transactions (user_id, amount, type, game_type, game_id, description)
  VALUES (p_user_id, p_amount, p_type, p_game_type, p_game_id, p_description);

  RETURN TRUE;
END;
$$;