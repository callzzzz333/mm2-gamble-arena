-- Create crates table
CREATE TABLE public.crates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  level_required INTEGER NOT NULL,
  image_url TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create crate_items junction table
CREATE TABLE public.crate_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  crate_id UUID NOT NULL REFERENCES public.crates(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  drop_chance NUMERIC NOT NULL DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user_claimed_rewards table
CREATE TABLE public.user_claimed_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  crate_id UUID NOT NULL REFERENCES public.crates(id) ON DELETE CASCADE,
  claimed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  opened BOOLEAN DEFAULT false,
  opened_at TIMESTAMP WITH TIME ZONE,
  received_item_id UUID REFERENCES public.items(id) ON DELETE SET NULL,
  UNIQUE(user_id, crate_id)
);

-- Enable RLS
ALTER TABLE public.crates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crate_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_claimed_rewards ENABLE ROW LEVEL SECURITY;

-- RLS Policies for crates
CREATE POLICY "Crates are viewable by everyone"
ON public.crates FOR SELECT
USING (true);

CREATE POLICY "Only admins can manage crates"
ON public.crates FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for crate_items
CREATE POLICY "Crate items are viewable by everyone"
ON public.crate_items FOR SELECT
USING (true);

CREATE POLICY "Only admins can manage crate items"
ON public.crate_items FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for user_claimed_rewards
CREATE POLICY "Users can view own claimed rewards"
ON public.user_claimed_rewards FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can claim rewards"
ON public.user_claimed_rewards FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own claimed rewards"
ON public.user_claimed_rewards FOR UPDATE
USING (auth.uid() = user_id);

-- Insert level crates
INSERT INTO public.crates (name, level_required, description) VALUES
('Bronze Crate', 25, 'Unlocked at Level 25 - Contains common to uncommon items'),
('Silver Crate', 50, 'Unlocked at Level 50 - Contains uncommon to rare items'),
('Gold Crate', 75, 'Unlocked at Level 75 - Contains rare to legendary items'),
('Diamond Crate', 99, 'Unlocked at Level 99 - Contains legendary and godly items');