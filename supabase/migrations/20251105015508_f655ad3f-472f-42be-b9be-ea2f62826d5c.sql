-- Add Roblox verification fields to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS roblox_username TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS roblox_id BIGINT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_code TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;

-- Create verification codes table
CREATE TABLE IF NOT EXISTS verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  roblox_username TEXT,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '10 minutes')
);

ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own codes"
  ON verification_codes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can create codes"
  ON verification_codes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update codes"
  ON verification_codes FOR UPDATE
  USING (true);

-- Function to generate verification code
CREATE OR REPLACE FUNCTION generate_verification_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  code TEXT;
BEGIN
  code := 'MM2-' || substr(md5(random()::text), 1, 8);
  RETURN UPPER(code);
END;
$$;