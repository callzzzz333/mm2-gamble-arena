-- Create roulette games table
CREATE TABLE public.roulette_games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'waiting',
  spin_result INTEGER,
  spin_color TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create roulette bets table
CREATE TABLE public.roulette_bets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.roulette_games(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bet_color TEXT NOT NULL,
  items JSONB DEFAULT '[]'::jsonb,
  bet_amount NUMERIC NOT NULL,
  won BOOLEAN,
  payout_amount NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create crash games table
CREATE TABLE public.crash_games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'waiting',
  crash_point NUMERIC,
  started_at TIMESTAMP WITH TIME ZONE,
  crashed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create crash bets table
CREATE TABLE public.crash_bets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.crash_games(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  items JSONB DEFAULT '[]'::jsonb,
  bet_amount NUMERIC NOT NULL,
  cashout_at NUMERIC,
  cashed_out BOOLEAN DEFAULT FALSE,
  won BOOLEAN,
  payout_amount NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.roulette_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roulette_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crash_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crash_bets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for roulette_games
CREATE POLICY "Everyone can view roulette games"
ON public.roulette_games FOR SELECT
USING (true);

CREATE POLICY "System can manage roulette games"
ON public.roulette_games FOR ALL
USING (true);

-- RLS Policies for roulette_bets
CREATE POLICY "Everyone can view roulette bets"
ON public.roulette_bets FOR SELECT
USING (true);

CREATE POLICY "Users can create roulette bets"
ON public.roulette_bets FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for crash_games
CREATE POLICY "Everyone can view crash games"
ON public.crash_games FOR SELECT
USING (true);

CREATE POLICY "System can manage crash games"
ON public.crash_games FOR ALL
USING (true);

-- RLS Policies for crash_bets
CREATE POLICY "Everyone can view crash bets"
ON public.crash_bets FOR SELECT
USING (true);

CREATE POLICY "Users can create crash bets"
ON public.crash_bets FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own crash bets"
ON public.crash_bets FOR UPDATE
USING (auth.uid() = user_id);