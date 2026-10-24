-- Smart rotation system for recurring tasks
-- Each task can define a rotation pool with per-member day restrictions

-- rotation_pool: JSON array of objects like:
-- [
--   { "user_id": "uuid", "excluded_days": [0, 6] },  -- exclude Sunday(0) and Saturday(6)
--   { "user_id": "uuid", "excluded_days": [] }        -- available all days
-- ]
-- 
-- rotation_strategy: 'none' (fixed assignee), 'fair' (balance by total daily load), 'round_robin' (simple sequential)

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS rotation_pool JSONB DEFAULT '[]'::jsonb;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS rotation_strategy TEXT NOT NULL DEFAULT 'none' CHECK (rotation_strategy IN ('none', 'fair', 'round_robin'));

-- Index for quick lookup of rotatable tasks
CREATE INDEX IF NOT EXISTS idx_tasks_rotation ON tasks(home_id, rotation_strategy) WHERE rotation_strategy != 'none' AND is_active = true;

-- Function to get daily load count for a user across all active tasks assigned to them for a given date
CREATE OR REPLACE FUNCTION get_user_daily_load(p_user_id UUID, p_home_id UUID, p_date DATE)
RETURNS INTEGER AS $$
DECLARE
  load INTEGER;
BEGIN
  SELECT COUNT(*) INTO load
  FROM tasks t
  JOIN task_assignments ta ON ta.task_id = t.id
  WHERE ta.user_id = p_user_id
    AND t.home_id = p_home_id
    AND t.is_active = true
    AND t.next_due_date IS NOT NULL
    AND t.next_due_date::date = p_date;
  RETURN COALESCE(load, 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to pick the fairest assignee from rotation pool
-- Considers: excluded days, total daily load, completion history
CREATE OR REPLACE FUNCTION pick_fair_assignee(
  p_task_id UUID,
  p_home_id UUID,
  p_target_date DATE
)
RETURNS UUID AS $$
DECLARE
  pool JSONB;
  candidate RECORD;
  best_user_id UUID;
  best_load INTEGER := 999999;
  target_dow INTEGER;
  user_load INTEGER;
  user_completions BIGINT;
  best_completions BIGINT := 999999;
BEGIN
  -- Get rotation pool
  SELECT rotation_pool INTO pool FROM tasks WHERE id = p_task_id;
  IF pool IS NULL OR jsonb_array_length(pool) = 0 THEN RETURN NULL; END IF;

  -- Day of week (0=Sunday, 6=Saturday)
  target_dow := EXTRACT(DOW FROM p_target_date)::INTEGER;

  -- Iterate candidates
  FOR candidate IN SELECT * FROM jsonb_array_elements(pool) AS elem
  LOOP
    -- Check if this day is excluded for this user
    IF candidate.elem->'excluded_days' @> to_jsonb(target_dow) THEN
      CONTINUE; -- Skip, user is excluded this day
    END IF;

    -- Get user's daily load for the target date
    user_load := get_user_daily_load(
      (candidate.elem->>'user_id')::UUID,
      p_home_id,
      p_target_date
    );

    -- Get total completions for this task (tie-breaker)
    SELECT COUNT(*) INTO user_completions
    FROM task_completions
    WHERE task_id = p_task_id AND completed_by = (candidate.elem->>'user_id')::UUID;

    -- Pick the one with least load, then least completions as tie-breaker
    IF user_load < best_load OR (user_load = best_load AND user_completions < best_completions) THEN
      best_load := user_load;
      best_completions := user_completions;
      best_user_id := (candidate.elem->>'user_id')::UUID;
    END IF;
  END LOOP;

  RETURN best_user_id;
END;
$$ LANGUAGE plpgsql STABLE;
