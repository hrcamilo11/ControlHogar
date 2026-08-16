-- Add assigned_to to subtasks for individual assignment
ALTER TABLE subtasks ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL;
