-- Add unique constraint to prevent duplicate giveaway entries
ALTER TABLE public.giveaway_entries
ADD CONSTRAINT giveaway_entries_user_giveaway_unique 
UNIQUE (giveaway_id, user_id);