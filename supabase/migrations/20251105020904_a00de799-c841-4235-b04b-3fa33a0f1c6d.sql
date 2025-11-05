-- Create crypto_deposits table
CREATE TABLE public.crypto_deposits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  payment_id TEXT NOT NULL UNIQUE,
  currency TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  usd_amount NUMERIC NOT NULL,
  pay_address TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'waiting',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  payment_url TEXT
);

-- Enable RLS
ALTER TABLE public.crypto_deposits ENABLE ROW LEVEL SECURITY;

-- Policies for crypto_deposits
CREATE POLICY "Users can view own crypto deposits"
  ON public.crypto_deposits
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create crypto deposits"
  ON public.crypto_deposits
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update crypto deposits"
  ON public.crypto_deposits
  FOR UPDATE
  USING (true);

CREATE POLICY "Admins can view all crypto deposits"
  ON public.crypto_deposits
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_crypto_deposits_payment_id ON public.crypto_deposits(payment_id);
CREATE INDEX idx_crypto_deposits_user_id ON public.crypto_deposits(user_id);
CREATE INDEX idx_crypto_deposits_status ON public.crypto_deposits(payment_status);