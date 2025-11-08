-- Remove level requirements from crates and update with new case images
UPDATE crates SET level_required = 0, image_url = 'https://i.imgur.com/YGJ5kCQ.png' WHERE name = 'Bronze Crate';
UPDATE crates SET level_required = 0, image_url = 'https://i.imgur.com/8xQJZkM.png' WHERE name = 'Silver Crate';
UPDATE crates SET level_required = 0, image_url = 'https://i.imgur.com/kXL9mQH.png' WHERE name = 'Gold Crate';
UPDATE crates SET level_required = 0, image_url = 'https://i.imgur.com/tVZ8nYx.png' WHERE name = 'Diamond Crate';

-- Add more cases for variety
INSERT INTO crates (name, description, level_required, image_url)
VALUES
  ('Legendary Case', 'Contains high-tier legendary items', 0, 'https://i.imgur.com/rB3vKxN.png'),
  ('Chroma Case', 'Exclusive chroma items inside', 0, 'https://i.imgur.com/pN8LzQW.png'),
  ('Ancient Case', 'Ancient and rare godly items', 0, 'https://i.imgur.com/wK7mXzR.png'),
  ('Premium Case', 'Premium selection of valuable items', 0, 'https://i.imgur.com/dQp8R2L.png')
ON CONFLICT (id) DO NOTHING;