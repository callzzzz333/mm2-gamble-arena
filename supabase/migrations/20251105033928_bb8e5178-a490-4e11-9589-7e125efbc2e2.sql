-- Add items_bet column to coinflip_games to store bet items
ALTER TABLE public.coinflip_games 
ADD COLUMN creator_items jsonb DEFAULT '[]'::jsonb,
ADD COLUMN joiner_items jsonb DEFAULT '[]'::jsonb;

-- Add comment for clarity
COMMENT ON COLUMN public.coinflip_games.creator_items IS 'Array of items bet by creator: [{item_id, quantity, value, name, image_url, rarity}]';
COMMENT ON COLUMN public.coinflip_games.joiner_items IS 'Array of items bet by joiner: [{item_id, quantity, value, name, image_url, rarity}]';