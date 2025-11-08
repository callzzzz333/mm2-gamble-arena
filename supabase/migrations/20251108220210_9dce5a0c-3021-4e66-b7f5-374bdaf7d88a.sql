-- Create Christmas raffle tickets table
CREATE TABLE IF NOT EXISTS public.christmas_raffle_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_tickets INTEGER NOT NULL DEFAULT 0,
  items_exchanged JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.christmas_raffle_tickets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Everyone can view raffle tickets"
  ON public.christmas_raffle_tickets
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own tickets"
  ON public.christmas_raffle_tickets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tickets"
  ON public.christmas_raffle_tickets
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.christmas_raffle_tickets;

-- Set replica identity for realtime
ALTER TABLE public.christmas_raffle_tickets REPLICA IDENTITY FULL;