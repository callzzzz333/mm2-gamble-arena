-- Enable realtime for roulette tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.roulette_bets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.roulette_games;