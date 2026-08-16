-- Add personal shopping lists support
-- is_personal: true = only visible to owner, false = shared with home
ALTER TABLE shopping_items ADD COLUMN IF NOT EXISTS is_personal BOOLEAN NOT NULL DEFAULT false;

-- Index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_shopping_items_personal ON shopping_items(home_id, is_personal, added_by);

-- Update RLS: personal items only visible to their owner
DROP POLICY IF EXISTS "Members view shopping items" ON shopping_items;
CREATE POLICY "Members view shopping items" ON shopping_items FOR SELECT
  USING (
    is_home_member(home_id, auth.uid())
    AND (is_personal = false OR added_by = auth.uid())
  );

DROP POLICY IF EXISTS "Members manage shopping items" ON shopping_items;
CREATE POLICY "Members manage shopping items" ON shopping_items FOR ALL
  USING (
    is_home_member(home_id, auth.uid())
    AND (is_personal = false OR added_by = auth.uid())
  );
