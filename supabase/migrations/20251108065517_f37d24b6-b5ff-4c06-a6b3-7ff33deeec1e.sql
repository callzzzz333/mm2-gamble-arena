-- Fix search_path for calculate_level function
CREATE OR REPLACE FUNCTION public.calculate_level(wagered NUMERIC)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
SET search_path = 'public'
AS $$
BEGIN
  -- Every $20 wagered = 1 level, starting at level 1
  -- Level caps at 99
  RETURN LEAST(99, GREATEST(1, 1 + FLOOR(wagered / 20)::INTEGER));
END;
$$;