-- Add game_type column to items table
ALTER TABLE public.items 
ADD COLUMN IF NOT EXISTS game_type TEXT NOT NULL DEFAULT 'MM2';

-- Add check constraint for valid game types
ALTER TABLE public.items
ADD CONSTRAINT valid_game_type CHECK (game_type IN ('MM2', 'SAB', 'PVB', 'GAG'));

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_items_game_type ON public.items(game_type);

-- Add demand column for GAG items (they have demand ratings)
ALTER TABLE public.items
ADD COLUMN IF NOT EXISTS demand NUMERIC;

-- Add additional metadata column for flexible data storage
ALTER TABLE public.items
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;