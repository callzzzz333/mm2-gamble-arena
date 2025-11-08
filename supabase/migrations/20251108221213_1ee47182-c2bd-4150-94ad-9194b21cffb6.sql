-- Create christmas raffle configuration table
CREATE TABLE IF NOT EXISTS public.christmas_raffle (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  year integer NOT NULL UNIQUE,
  end_date timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'active',
  winner_id uuid,
  total_prize_value numeric NOT NULL DEFAULT 0,
  prize_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  drawn_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.christmas_raffle ENABLE ROW LEVEL SECURITY;

-- Everyone can view the raffle
CREATE POLICY "Everyone can view christmas raffle"
  ON public.christmas_raffle
  FOR SELECT
  USING (true);

-- System can manage raffle
CREATE POLICY "System can manage christmas raffle"
  ON public.christmas_raffle
  FOR ALL
  USING (true);

-- Insert 2024 Christmas raffle
INSERT INTO public.christmas_raffle (year, end_date, status)
VALUES (2024, '2024-12-25 00:00:00+00'::timestamp with time zone, 'active')
ON CONFLICT (year) DO NOTHING;