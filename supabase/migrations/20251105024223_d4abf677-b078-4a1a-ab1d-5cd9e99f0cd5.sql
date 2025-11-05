-- Add stats columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS total_wagered NUMERIC DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_deposited NUMERIC DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_profits NUMERIC DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create function to update user stats
CREATE OR REPLACE FUNCTION public.update_user_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update stats based on transaction type
  IF NEW.type = 'deposit' THEN
    UPDATE public.profiles
    SET total_deposited = total_deposited + NEW.amount
    WHERE id = NEW.user_id;
  ELSIF NEW.type = 'bet' THEN
    UPDATE public.profiles
    SET total_wagered = total_wagered + ABS(NEW.amount)
    WHERE id = NEW.user_id;
  ELSIF NEW.type = 'win' THEN
    UPDATE public.profiles
    SET total_profits = total_profits + NEW.amount
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically update stats
DROP TRIGGER IF EXISTS update_stats_on_transaction ON public.transactions;
CREATE TRIGGER update_stats_on_transaction
  AFTER INSERT ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_stats();