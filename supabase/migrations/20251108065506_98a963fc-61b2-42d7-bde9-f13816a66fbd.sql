-- Add level column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS level INTEGER NOT NULL DEFAULT 1;

-- Add constraint to keep level between 1 and 99
ALTER TABLE public.profiles
ADD CONSTRAINT level_range CHECK (level >= 1 AND level <= 99);

-- Create function to calculate level from total_wagered
CREATE OR REPLACE FUNCTION public.calculate_level(wagered NUMERIC)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Every $20 wagered = 1 level, starting at level 1
  -- Level caps at 99
  RETURN LEAST(99, GREATEST(1, 1 + FLOOR(wagered / 20)::INTEGER));
END;
$$;

-- Create function to update user level based on total_wagered
CREATE OR REPLACE FUNCTION public.update_user_level()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Update level based on total_wagered
  NEW.level := calculate_level(NEW.total_wagered);
  RETURN NEW;
END;
$$;

-- Create trigger to auto-update level when total_wagered changes
DROP TRIGGER IF EXISTS trigger_update_user_level ON public.profiles;
CREATE TRIGGER trigger_update_user_level
BEFORE UPDATE OF total_wagered ON public.profiles
FOR EACH ROW
WHEN (OLD.total_wagered IS DISTINCT FROM NEW.total_wagered)
EXECUTE FUNCTION public.update_user_level();

-- Update existing users' levels based on their total_wagered
UPDATE public.profiles
SET level = calculate_level(total_wagered);