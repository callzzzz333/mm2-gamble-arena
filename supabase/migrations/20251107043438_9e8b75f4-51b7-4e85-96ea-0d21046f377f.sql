-- Create a public view for basic profile information (username/avatar only)
-- This allows games to display player names without exposing sensitive data

CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  id,
  username,
  avatar_url,
  roblox_username
FROM public.profiles;

-- Grant access to authenticated users
GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_profiles TO anon;

-- Add policy to allow game-related profile lookups
CREATE POLICY "Users can view profiles of players in their games" 
  ON profiles FOR SELECT 
  USING (
    auth.uid() = id 
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM coinflip_games 
      WHERE (creator_id = auth.uid() OR joiner_id = auth.uid()) 
        AND (creator_id = profiles.id OR joiner_id = profiles.id)
    )
    OR EXISTS (
      SELECT 1 FROM jackpot_entries je1
      WHERE je1.user_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM jackpot_entries je2
          WHERE je2.game_id = je1.game_id AND je2.user_id = profiles.id
        )
    )
  );

-- Allow viewing usernames in chat context
CREATE POLICY "Users can view profiles of chat participants"
  ON profiles FOR SELECT
  USING (
    auth.uid() = id
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM chat_messages
      WHERE user_id = profiles.id
    )
  );