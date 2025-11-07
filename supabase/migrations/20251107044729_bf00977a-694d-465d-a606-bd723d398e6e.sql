-- Fix jackpot_games RLS policy to allow system to create games
DROP POLICY IF EXISTS "Only system can create jackpot games" ON jackpot_games;

-- Allow INSERT for jackpot games (system can create new games)
CREATE POLICY "System can create jackpot games" 
ON jackpot_games 
FOR INSERT 
WITH CHECK (true);

-- Allow UPDATE for jackpot games (system can update game state)
CREATE POLICY "System can update jackpot games" 
ON jackpot_games 
FOR UPDATE 
USING (true);