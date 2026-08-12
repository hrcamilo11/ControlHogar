-- Add task_id to expenses to associate expenses with tasks
ALTER TABLE expenses ADD COLUMN task_id UUID REFERENCES tasks(id) ON DELETE SET NULL;

CREATE INDEX idx_expenses_task_id ON expenses(task_id) WHERE task_id IS NOT NULL;
