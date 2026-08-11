-- ControlHogar U2: Tasks Schema

CREATE TYPE task_frequency AS ENUM ('once', 'daily', 'weekly', 'biweekly', 'monthly', 'custom');

-- Tasks table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description TEXT CHECK (char_length(description) <= 1000),
  created_by UUID NOT NULL REFERENCES profiles(id),
  frequency_type task_frequency NOT NULL DEFAULT 'once',
  frequency_config JSONB,
  next_due_date TIMESTAMPTZ,
  rotation_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  rotation_members UUID[] DEFAULT '{}',
  rotation_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Task assignments
CREATE TABLE task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(task_id, user_id)
);

-- Task completions (history)
CREATE TABLE task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  completed_by UUID NOT NULL REFERENCES profiles(id),
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  was_overdue BOOLEAN NOT NULL DEFAULT FALSE
);

-- Indexes
CREATE INDEX idx_tasks_home_id ON tasks(home_id);
CREATE INDEX idx_tasks_active ON tasks(home_id, is_active) WHERE is_active = TRUE;
CREATE INDEX idx_tasks_due_date ON tasks(next_due_date) WHERE is_active = TRUE AND next_due_date IS NOT NULL;
CREATE INDEX idx_task_assignments_task ON task_assignments(task_id);
CREATE INDEX idx_task_assignments_user ON task_assignments(user_id);
CREATE INDEX idx_task_completions_task ON task_completions(task_id);
CREATE INDEX idx_task_completions_user ON task_completions(completed_by);
CREATE INDEX idx_task_completions_date ON task_completions(completed_at DESC);

-- Updated_at trigger
CREATE TRIGGER set_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Tasks
CREATE POLICY "Members view tasks"
  ON tasks FOR SELECT
  USING (is_home_member(home_id, auth.uid()));

CREATE POLICY "Members create tasks"
  ON tasks FOR INSERT
  WITH CHECK (
    is_home_member(home_id, auth.uid())
    AND get_home_role(home_id, auth.uid()) IN ('owner', 'admin', 'member')
  );

CREATE POLICY "Authorized edit tasks"
  ON tasks FOR UPDATE
  USING (
    created_by = auth.uid()
    OR get_home_role(home_id, auth.uid()) IN ('owner', 'admin')
  );

CREATE POLICY "Authorized delete tasks"
  ON tasks FOR DELETE
  USING (
    created_by = auth.uid()
    OR get_home_role(home_id, auth.uid()) IN ('owner', 'admin')
  );

-- RLS Policies: Task Assignments
CREATE POLICY "Members view assignments"
  ON task_assignments FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_id AND is_home_member(t.home_id, auth.uid()))
  );

CREATE POLICY "Members manage assignments"
  ON task_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.id = task_id
      AND is_home_member(t.home_id, auth.uid())
      AND get_home_role(t.home_id, auth.uid()) IN ('owner', 'admin', 'member')
    )
  );

-- RLS Policies: Task Completions
CREATE POLICY "Members view completions"
  ON task_completions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_id AND is_home_member(t.home_id, auth.uid()))
  );

CREATE POLICY "Members insert completions"
  ON task_completions FOR INSERT
  WITH CHECK (completed_by = auth.uid());

-- Trigger: Log task completion as activity
CREATE OR REPLACE FUNCTION handle_task_completed()
RETURNS TRIGGER AS $$
DECLARE
  v_task RECORD;
BEGIN
  SELECT * INTO v_task FROM tasks WHERE id = NEW.task_id;

  -- Log activity
  INSERT INTO activity_entries (home_id, user_id, action, entity_type, entity_id, metadata)
  VALUES (
    v_task.home_id,
    NEW.completed_by,
    'completed',
    'task',
    NEW.task_id,
    jsonb_build_object('title', v_task.title, 'was_overdue', NEW.was_overdue)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_task_completed
  AFTER INSERT ON task_completions
  FOR EACH ROW EXECUTE FUNCTION handle_task_completed();
