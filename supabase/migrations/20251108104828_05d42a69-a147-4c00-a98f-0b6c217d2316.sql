-- Create case_battles table
CREATE TABLE public.case_battles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES auth.users(id),
  total_value NUMERIC NOT NULL DEFAULT 0,
  mode TEXT NOT NULL DEFAULT '1v1', -- '1v1', '1v1v1', '1v1v1v1', 'group'
  max_players INTEGER NOT NULL DEFAULT 2,
  rounds INTEGER NOT NULL DEFAULT 1,
  current_round INTEGER NOT NULL DEFAULT 0,
  cases JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of case IDs
  status TEXT NOT NULL DEFAULT 'waiting', -- 'waiting', 'active', 'completed'
  winner_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create case_battle_participants table
CREATE TABLE public.case_battle_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  battle_id UUID NOT NULL REFERENCES public.case_battles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  position INTEGER NOT NULL, -- 1, 2, 3, 4
  total_value NUMERIC NOT NULL DEFAULT 0,
  items_won JSONB NOT NULL DEFAULT '[]'::jsonb,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(battle_id, user_id),
  UNIQUE(battle_id, position)
);

-- Create case_battle_rounds table
CREATE TABLE public.case_battle_rounds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  battle_id UUID NOT NULL REFERENCES public.case_battles(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  case_index INTEGER NOT NULL, -- Which case in the battle
  results JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of {user_id, item_id, value}
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(battle_id, round_number, case_index)
);

-- Enable RLS
ALTER TABLE public.case_battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_battle_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_battle_rounds ENABLE ROW LEVEL SECURITY;

-- RLS Policies for case_battles
CREATE POLICY "Case battles are viewable by everyone"
  ON public.case_battles FOR SELECT
  USING (true);

CREATE POLICY "Users can create case battles"
  ON public.case_battles FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "System can update case battles"
  ON public.case_battles FOR UPDATE
  USING (true);

-- RLS Policies for case_battle_participants
CREATE POLICY "Case battle participants are viewable by everyone"
  ON public.case_battle_participants FOR SELECT
  USING (true);

CREATE POLICY "Users can join case battles"
  ON public.case_battle_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update participants"
  ON public.case_battle_participants FOR UPDATE
  USING (true);

-- RLS Policies for case_battle_rounds
CREATE POLICY "Case battle rounds are viewable by everyone"
  ON public.case_battle_rounds FOR SELECT
  USING (true);

CREATE POLICY "System can create rounds"
  ON public.case_battle_rounds FOR INSERT
  WITH CHECK (true);

-- Add realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.case_battles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.case_battle_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.case_battle_rounds;