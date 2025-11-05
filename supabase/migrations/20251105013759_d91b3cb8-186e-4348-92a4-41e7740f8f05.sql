-- Create withdrawals table
CREATE TABLE public.withdrawals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  trader_username TEXT NOT NULL,
  private_server_link TEXT NOT NULL,
  items_requested JSONB,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

-- Users can create withdrawals
CREATE POLICY "Users can create withdrawals"
  ON public.withdrawals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can view own withdrawals
CREATE POLICY "Users can view own withdrawals"
  ON public.withdrawals FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all withdrawals
CREATE POLICY "Admins can view all withdrawals"
  ON public.withdrawals FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update withdrawals
CREATE POLICY "Admins can update withdrawals"
  ON public.withdrawals FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));