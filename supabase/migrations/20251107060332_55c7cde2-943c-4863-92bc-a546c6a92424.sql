-- Update transactions type constraint to allow 'bet' type
ALTER TABLE public.transactions DROP CONSTRAINT transactions_type_check;

ALTER TABLE public.transactions ADD CONSTRAINT transactions_type_check 
CHECK (type IN ('deposit', 'withdrawal', 'win', 'loss', 'bet', 'admin_credit'));