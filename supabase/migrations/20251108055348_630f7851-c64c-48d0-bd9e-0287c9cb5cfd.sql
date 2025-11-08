-- Make item_id nullable since we now use prize_items JSONB
ALTER TABLE public.giveaways 
ALTER COLUMN item_id DROP NOT NULL;