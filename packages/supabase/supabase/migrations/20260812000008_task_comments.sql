-- Comments on tasks
CREATE TABLE task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_task_comments_task ON task_comments(task_id);

ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view task comments"
  ON task_comments FOR SELECT
  USING (EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_id AND is_home_member(t.home_id, auth.uid())));

CREATE POLICY "Members add task comments"
  ON task_comments FOR INSERT
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM tasks t WHERE t.id = task_id AND is_home_member(t.home_id, auth.uid())));

CREATE POLICY "Users delete own comments"
  ON task_comments FOR DELETE
  USING (user_id = auth.uid());
