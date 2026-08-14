-- Add currency to homes for shared financial display
ALTER TABLE homes ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'COP';

-- Allow custom categories per home (already exists but ensure home_id is used)
-- expense_categories already has home_id column
