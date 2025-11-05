-- Add items column to jackpot_entries to store bet items
ALTER TABLE public.jackpot_entries 
ADD COLUMN items jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.jackpot_entries.items IS 'Array of items bet by user: [{item_id, quantity, value, name, image_url, rarity}]';