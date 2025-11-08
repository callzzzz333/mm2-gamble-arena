-- First drop the constraint
ALTER TABLE giveaways DROP CONSTRAINT IF EXISTS giveaways_status_check;

-- Update ended status to completed
UPDATE giveaways SET status = 'completed' WHERE status = 'ended';

-- Add new constraint with drawing status
ALTER TABLE giveaways ADD CONSTRAINT giveaways_status_check 
CHECK (status IN ('active', 'drawing', 'completed'));