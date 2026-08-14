-- Subtasks / checklist items within a task
CREATE TABLE subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_by UUID REFERENCES profiles(id),
  completed_at TIMESTAMPTZ,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subtasks_task ON subtasks(task_id);

ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view subtasks"
  ON subtasks FOR SELECT
  USING (EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_id AND is_home_member(t.home_id, auth.uid())));

CREATE POLICY "Members manage subtasks"
  ON subtasks FOR ALL
  USING (EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_id AND is_home_member(t.home_id, auth.uid()) AND get_home_role(t.home_id, auth.uid()) != 'guest'));
