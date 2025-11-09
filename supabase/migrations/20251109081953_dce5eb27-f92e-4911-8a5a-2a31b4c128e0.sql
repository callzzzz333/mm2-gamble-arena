-- Add current_player_id to track whose turn it is
ALTER TABLE public.blackjack_tables
ADD COLUMN current_player_id uuid REFERENCES public.blackjack_players(id);

-- Add turn_started_at to track when turn started
ALTER TABLE public.blackjack_tables
ADD COLUMN turn_started_at timestamp with time zone;

-- Add turn_timeout_seconds to configure timeout duration
ALTER TABLE public.blackjack_tables
ADD COLUMN turn_timeout_seconds integer DEFAULT 30;