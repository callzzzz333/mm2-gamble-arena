-- Enable realtime for profiles table to allow balance updates to propagate
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;