-- Create giveaways table
CREATE TABLE IF NOT EXISTS public.giveaways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  winner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  ends_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '5 minutes'),
  ended_at TIMESTAMPTZ
);

-- Create giveaway entries table
CREATE TABLE IF NOT EXISTS public.giveaway_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  giveaway_id UUID NOT NULL REFERENCES public.giveaways(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(giveaway_id, user_id)
);

-- Enable RLS
ALTER TABLE public.giveaways ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.giveaway_entries ENABLE ROW LEVEL SECURITY;

-- Giveaways policies
CREATE POLICY "Giveaways are viewable by everyone"
ON public.giveaways FOR SELECT USING (true);

CREATE POLICY "Users can create giveaways"
ON public.giveaways FOR INSERT 
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their giveaways"
ON public.giveaways FOR UPDATE
USING (auth.uid() = creator_id);

-- Giveaway entries policies
CREATE POLICY "Giveaway entries are viewable by everyone"
ON public.giveaway_entries FOR SELECT USING (true);

CREATE POLICY "Users can join giveaways"
ON public.giveaway_entries FOR INSERT
WITH CHECK (auth.uid() = user_id);