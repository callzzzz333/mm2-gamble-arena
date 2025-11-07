-- Add RLS policy to allow everyone to view game-related transactions (not deposits/withdrawals)
CREATE POLICY "Everyone can view game transactions"
ON public.transactions
FOR SELECT
USING (
  game_type IS NOT NULL 
  AND type IN ('bet', 'win', 'loss')
);