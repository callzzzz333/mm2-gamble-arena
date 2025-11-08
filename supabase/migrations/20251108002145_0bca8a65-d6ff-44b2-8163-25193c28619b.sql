-- Add new columns to existing giveaways table
ALTER TABLE public.giveaways 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS prize_items JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS total_value DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS type TEXT;

-- Update constraints
ALTER TABLE public.giveaways DROP CONSTRAINT IF EXISTS giveaways_type_check;
ALTER TABLE public.giveaways ADD CONSTRAINT giveaways_type_check CHECK (type IN ('auto', 'manual') OR type IS NULL);

-- Update existing rows to have default values
UPDATE public.giveaways 
SET 
  title = COALESCE(title, 'Item Giveaway'),
  type = COALESCE(type, 'manual'),
  prize_items = COALESCE(prize_items, '[]'::jsonb),
  total_value = COALESCE(total_value, 0)
WHERE title IS NULL OR type IS NULL;