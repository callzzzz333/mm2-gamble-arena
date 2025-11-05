-- Add admin role to solzz0_0 user
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'admin'::app_role
FROM public.profiles p
WHERE p.username = 'solzz0_0'
ON CONFLICT (user_id, role) DO NOTHING;