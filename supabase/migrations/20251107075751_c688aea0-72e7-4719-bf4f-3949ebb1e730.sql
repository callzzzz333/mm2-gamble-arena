-- Fix RLS policies for coinflip_games
ALTER TABLE public.coinflip_games ENABLE ROW LEVEL SECURITY;

-- Replace policies with known safe versions
DROP POLICY IF EXISTS coinflip_select_all ON public.coinflip_games;
DROP POLICY IF EXISTS coinflip_insert_creator ON public.coinflip_games;
DROP POLICY IF EXISTS coinflip_update_creator_or_joiner_or_claim ON public.coinflip_games;
DROP POLICY IF EXISTS coinflip_delete_finished_by_participants ON public.coinflip_games;

CREATE POLICY coinflip_select_all
ON public.coinflip_games
FOR SELECT
USING (true);

CREATE POLICY coinflip_insert_creator
ON public.coinflip_games
FOR INSERT
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY coinflip_update_creator_or_joiner_or_claim
ON public.coinflip_games
FOR UPDATE
USING (
  auth.uid() = creator_id OR 
  auth.uid() = joiner_id OR 
  (status = 'waiting' AND joiner_id IS NULL)
)
WITH CHECK (
  auth.uid() = creator_id OR auth.uid() = joiner_id
);

CREATE POLICY coinflip_delete_finished_by_participants
ON public.coinflip_games
FOR DELETE
USING (
  (status = 'completed' OR status = 'expired') AND (auth.uid() = creator_id OR auth.uid() = joiner_id)
);