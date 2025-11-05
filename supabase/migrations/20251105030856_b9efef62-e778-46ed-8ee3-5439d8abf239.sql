-- Add item manager role for users who can add items to inventories
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'item_manager';