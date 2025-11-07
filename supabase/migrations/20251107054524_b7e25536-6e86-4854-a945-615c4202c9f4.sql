-- Ensure the update_user_stats trigger exists and is properly configured
-- Drop the trigger if it exists to recreate it
DROP TRIGGER IF EXISTS on_transaction_created ON public.transactions;

-- Create the trigger to update user stats on transaction insert
CREATE TRIGGER on_transaction_created
  AFTER INSERT ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_stats();