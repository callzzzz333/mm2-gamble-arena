-- Update items table to support Rolimons data structure
ALTER TABLE items ADD COLUMN IF NOT EXISTS acronym TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS rap INTEGER;
ALTER TABLE items ADD COLUMN IF NOT EXISTS default_value INTEGER;
ALTER TABLE items ADD COLUMN IF NOT EXISTS projected INTEGER;
ALTER TABLE items ADD COLUMN IF NOT EXISTS hyped INTEGER;
ALTER TABLE items ADD COLUMN IF NOT EXISTS rare INTEGER;
ALTER TABLE items ADD COLUMN IF NOT EXISTS rolimons_id TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_items_game_type ON items(game_type);
CREATE INDEX IF NOT EXISTS idx_items_rolimons_id ON items(rolimons_id);