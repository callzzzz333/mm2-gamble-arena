-- Drop and recreate the view with SECURITY INVOKER explicitly set
DROP VIEW IF EXISTS public.public_profiles CASCADE;

CREATE VIEW public.public_profiles 
WITH (security_invoker = true)
AS
SELECT 
  id,
  username,
  avatar_url,
  roblox_username
FROM public.profiles;

-- Grant select permission on the view
GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_profiles TO anon;