-- Restrict user_roles table visibility to own records only
DROP POLICY IF EXISTS "User roles are viewable by everyone" ON public.user_roles;

CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Add unique constraint on profiles username to prevent duplicates
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_username_unique UNIQUE (username);

-- Add constraint to prevent NULL usernames
ALTER TABLE public.profiles
ALTER COLUMN username SET NOT NULL;