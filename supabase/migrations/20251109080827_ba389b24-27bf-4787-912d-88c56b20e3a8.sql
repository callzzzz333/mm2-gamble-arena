-- Remove case battle tables
DROP TABLE IF EXISTS case_battle_rounds CASCADE;
DROP TABLE IF EXISTS case_battle_participants CASCADE;
DROP TABLE IF EXISTS case_battles CASCADE;

-- Create upgrader tables
CREATE TABLE upgrader_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  input_item_id uuid NOT NULL REFERENCES items(id),
  target_item_id uuid NOT NULL REFERENCES items(id),
  success_chance numeric NOT NULL,
  won boolean DEFAULT NULL,
  won_item_id uuid REFERENCES items(id),
  created_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone
);

ALTER TABLE upgrader_games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own upgrader games"
  ON upgrader_games FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create upgrader games"
  ON upgrader_games FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create blackjack tables
CREATE TABLE blackjack_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'waiting', -- waiting, in_progress, completed
  max_players integer NOT NULL DEFAULT 6,
  bet_amount numeric NOT NULL,
  dealer_hand jsonb DEFAULT '[]'::jsonb,
  dealer_score integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  winner_id uuid REFERENCES auth.users(id)
);

CREATE TABLE blackjack_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid NOT NULL REFERENCES blackjack_tables(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  hand jsonb NOT NULL DEFAULT '[]'::jsonb,
  score integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'playing', -- playing, stand, bust
  bet_amount numeric NOT NULL,
  won boolean DEFAULT NULL,
  joined_at timestamp with time zone DEFAULT now(),
  UNIQUE(table_id, user_id)
);

ALTER TABLE blackjack_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE blackjack_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view blackjack tables"
  ON blackjack_tables FOR SELECT
  USING (true);

CREATE POLICY "System can manage blackjack tables"
  ON blackjack_tables FOR ALL
  USING (true);

CREATE POLICY "Everyone can view blackjack players"
  ON blackjack_players FOR SELECT
  USING (true);

CREATE POLICY "Users can join blackjack tables"
  ON blackjack_players FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update blackjack players"
  ON blackjack_players FOR UPDATE
  USING (true);

-- Enable realtime for blackjack tables
ALTER TABLE blackjack_tables REPLICA IDENTITY FULL;
ALTER TABLE blackjack_players REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE blackjack_tables;
ALTER PUBLICATION supabase_realtime ADD TABLE blackjack_players;

-- Update crates to be level-based (every 25 levels)
DELETE FROM crate_items;
DELETE FROM user_claimed_rewards;
DELETE FROM crates;

-- Create level-based crates
INSERT INTO crates (id, name, description, level_required, image_url) VALUES
  (gen_random_uuid(), 'Starter Crate', 'Basic items for beginners', 1, NULL),
  (gen_random_uuid(), 'Bronze Crate', 'Better items for advancing players', 25, NULL),
  (gen_random_uuid(), 'Silver Crate', 'Quality items for skilled players', 50, NULL),
  (gen_random_uuid(), 'Gold Crate', 'Premium items for veteran players', 75, NULL),
  (gen_random_uuid(), 'Platinum Crate', 'Legendary items for elite players', 99, NULL);