-- Add reply functionality columns to chat_messages table
ALTER TABLE chat_messages
ADD COLUMN reply_to_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
ADD COLUMN reply_to_username TEXT,
ADD COLUMN reply_to_message TEXT;