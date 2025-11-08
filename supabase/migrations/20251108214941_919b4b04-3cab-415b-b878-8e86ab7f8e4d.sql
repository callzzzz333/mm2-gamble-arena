-- Enable realtime for giveaways and giveaway_entries tables (already in publication)
ALTER TABLE public.giveaways REPLICA IDENTITY FULL;
ALTER TABLE public.giveaway_entries REPLICA IDENTITY FULL;