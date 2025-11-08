-- Fix Security Definer View by recreating without SECURITY DEFINER
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles AS
SELECT 
  id,
  username,
  avatar_url,
  roblox_username
FROM public.profiles;

-- Grant select permission on the view
GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_profiles TO anon;