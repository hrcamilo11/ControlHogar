-- Add task_id to maintenances to associate with tasks
ALTER TABLE maintenances ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES tasks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_maintenances_task ON maintenances(task_id) WHERE task_id IS NOT NULL;
