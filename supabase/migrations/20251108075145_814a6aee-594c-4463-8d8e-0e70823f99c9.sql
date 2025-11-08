-- Remove unique constraint to allow daily claims
ALTER TABLE public.user_claimed_rewards DROP CONSTRAINT IF EXISTS user_claimed_rewards_user_id_crate_id_key;

-- Add can_claim_daily check (returns true if user hasn't claimed in last 24 hours or never claimed)
CREATE OR REPLACE FUNCTION can_claim_crate_daily(p_user_id UUID, p_crate_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  last_claim TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get most recent claim for this user and crate
  SELECT claimed_at INTO last_claim
  FROM user_claimed_rewards
  WHERE user_id = p_user_id AND crate_id = p_crate_id
  ORDER BY claimed_at DESC
  LIMIT 1;
  
  -- If never claimed or last claim was more than 24 hours ago
  IF last_claim IS NULL OR (NOW() - last_claim) >= INTERVAL '24 hours' THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;