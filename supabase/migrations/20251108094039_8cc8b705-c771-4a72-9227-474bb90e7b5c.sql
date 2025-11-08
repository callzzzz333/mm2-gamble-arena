-- Enable realtime for giveaways and giveaway_entries tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.giveaways;
ALTER PUBLICATION supabase_realtime ADD TABLE public.giveaway_entries;