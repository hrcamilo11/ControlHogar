-- Merge maintenances into tasks
-- Add new columns to tasks table

-- Task type: 'task' (default) or 'maintenance'
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_type TEXT NOT NULL DEFAULT 'task' CHECK (task_type IN ('task', 'maintenance'));

-- Priority (for maintenance type): high, medium, low
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority TEXT CHECK (priority IN ('high', 'medium', 'low'));

-- Status: extends beyond just active/inactive
-- 'active' = normal task, 'in_progress' = started maintenance, 'completed' = done
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'in_progress', 'completed'));

-- Completed by (who marked it done for maintenance)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES profiles(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Index for filtering by type
CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(home_id, task_type);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(home_id, status);

-- Migrate existing maintenances into tasks
INSERT INTO tasks (home_id, title, description, created_by, frequency_type, task_type, priority, status, completed_by, completed_at, next_due_date, is_active, created_at, updated_at)
SELECT 
  home_id, title, description, created_by, 'once', 'maintenance', priority::text, status::text,
  completed_by, completed_at, estimated_date, 
  CASE WHEN status = 'completed' THEN false ELSE true END,
  created_at, updated_at
FROM maintenances;

-- Migrate maintenance photos to link to new task IDs
-- (We skip this for now as it requires mapping old IDs to new IDs)
-- Photos and notes will need manual migration or can be recreated

-- Update task assignments for migrated maintenances
INSERT INTO task_assignments (task_id, user_id)
SELECT t.id, m.assigned_to
FROM maintenances m
JOIN tasks t ON t.title = m.title AND t.home_id = m.home_id AND t.task_type = 'maintenance' AND t.created_at = m.created_at
WHERE m.assigned_to IS NOT NULL;

-- Associate photos with new task IDs
-- Create a photos table that works for tasks (replaces maintenance_photos)
ALTER TABLE maintenance_photos ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES tasks(id) ON DELETE CASCADE;

-- Map photos to their new task IDs
UPDATE maintenance_photos mp
SET task_id = t.id
FROM maintenances m
JOIN tasks t ON t.title = m.title AND t.home_id = m.home_id AND t.task_type = 'maintenance' AND t.created_at = m.created_at
WHERE mp.maintenance_id = m.id;

-- Rename maintenance_photos to task_photos for clarity
ALTER TABLE maintenance_photos RENAME TO task_photos;

-- Similarly for notes
ALTER TABLE maintenance_notes ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES tasks(id) ON DELETE CASCADE;

UPDATE maintenance_notes mn
SET task_id = t.id
FROM maintenances m
JOIN tasks t ON t.title = m.title AND t.home_id = m.home_id AND t.task_type = 'maintenance' AND t.created_at = m.created_at
WHERE mn.maintenance_id = m.id;

ALTER TABLE maintenance_notes RENAME TO task_notes;

-- RLS for renamed tables
CREATE POLICY "Members view task photos" ON task_photos FOR SELECT
  USING (EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_id AND is_home_member(t.home_id, auth.uid())));

CREATE POLICY "Members manage task photos" ON task_photos FOR ALL
  USING (EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_id AND is_home_member(t.home_id, auth.uid())));

CREATE POLICY "Members view task notes" ON task_notes FOR SELECT
  USING (EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_id AND is_home_member(t.home_id, auth.uid())));

CREATE POLICY "Members manage task notes" ON task_notes FOR ALL
  USING (EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_id AND is_home_member(t.home_id, auth.uid())));
