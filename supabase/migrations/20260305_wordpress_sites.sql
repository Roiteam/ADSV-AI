-- Add wordpress_sites JSONB column to user_settings
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS wordpress_sites jsonb DEFAULT '[]'::jsonb;
