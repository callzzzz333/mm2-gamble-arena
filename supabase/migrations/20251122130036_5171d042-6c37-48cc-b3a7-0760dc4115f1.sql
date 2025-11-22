-- Create user watchlist table for favorite items
CREATE TABLE IF NOT EXISTS public.user_watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, item_id)
);

ALTER TABLE public.user_watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own watchlist"
  ON public.user_watchlist FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add to own watchlist"
  ON public.user_watchlist FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove from own watchlist"
  ON public.user_watchlist FOR DELETE
  USING (auth.uid() = user_id);

-- Create price history table for tracking value changes
CREATE TABLE IF NOT EXISTS public.price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  value NUMERIC NOT NULL,
  rap INTEGER,
  demand NUMERIC,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view price history"
  ON public.price_history FOR SELECT
  USING (true);

CREATE POLICY "System can insert price history"
  ON public.price_history FOR INSERT
  WITH CHECK (true);

-- Create activity feed table for live tracking
CREATE TABLE IF NOT EXISTS public.activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
  amount NUMERIC,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view activity feed"
  ON public.activity_feed FOR SELECT
  USING (true);

CREATE POLICY "System can insert activities"
  ON public.activity_feed FOR INSERT
  WITH CHECK (true);

-- Create market statistics table
CREATE TABLE IF NOT EXISTS public.market_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_type TEXT NOT NULL,
  total_volume NUMERIC DEFAULT 0,
  total_transactions INTEGER DEFAULT 0,
  average_price NUMERIC DEFAULT 0,
  trending_items JSONB DEFAULT '[]',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(game_type)
);

ALTER TABLE public.market_statistics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view market statistics"
  ON public.market_statistics FOR SELECT
  USING (true);

CREATE POLICY "System can update market statistics"
  ON public.market_statistics FOR ALL
  USING (true);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_watchlist_user_id ON public.user_watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_price_history_item_id ON public.price_history(item_id);
CREATE INDEX IF NOT EXISTS idx_price_history_recorded_at ON public.price_history(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_feed_created_at ON public.activity_feed(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_feed_user_id ON public.activity_feed(user_id);

-- Enable realtime for tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.price_history;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_feed;
ALTER PUBLICATION supabase_realtime ADD TABLE public.market_statistics;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_watchlist;