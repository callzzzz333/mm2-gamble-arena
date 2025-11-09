-- Add winners column to store multiple winner IDs and their amounts
ALTER TABLE christmas_raffle 
ADD COLUMN winners jsonb DEFAULT '[]'::jsonb;

-- Add comment for clarity
COMMENT ON COLUMN christmas_raffle.winners IS 'Array of winner objects: [{user_id: uuid, amount: number}]';