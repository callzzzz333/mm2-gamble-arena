-- Fix search_path for generate_verification_code function
CREATE OR REPLACE FUNCTION generate_verification_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code TEXT;
BEGIN
  code := 'MM2-' || substr(md5(random()::text), 1, 8);
  RETURN UPPER(code);
END;
$$;