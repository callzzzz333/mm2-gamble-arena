-- Add discord_message_id to giveaways table to track Discord webhook messages
ALTER TABLE public.giveaways
ADD COLUMN discord_message_id text;