-- ControlHogar U4: Maintenance Schema

CREATE TYPE maintenance_status AS ENUM ('pending', 'in_progress', 'completed');
CREATE TYPE maintenance_priority AS ENUM ('high', 'medium', 'low');

-- Maintenances
CREATE TABLE maintenances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  description TEXT CHECK (char_length(description) <= 1000),
  status maintenance_status NOT NULL DEFAULT 'pending',
  priority maintenance_priority NOT NULL DEFAULT 'medium',
  created_by UUID NOT NULL REFERENCES profiles(id),
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Maintenance notes
CREATE TABLE maintenance_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_id UUID NOT NULL REFERENCES maintenances(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Maintenance photos
CREATE TABLE maintenance_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_id UUID NOT NULL REFERENCES maintenances(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  url TEXT NOT NULL,
  caption TEXT CHECK (char_length(caption) <= 200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_maintenances_home ON maintenances(home_id);
CREATE INDEX idx_maintenances_status ON maintenances(home_id, status);
CREATE INDEX idx_maintenances_priority ON maintenances(home_id, priority);
CREATE INDEX idx_maintenance_notes_maint ON maintenance_notes(maintenance_id);
CREATE INDEX idx_maintenance_photos_maint ON maintenance_photos(maintenance_id);

-- Updated_at trigger
CREATE TRIGGER set_maintenances_updated_at
  BEFORE UPDATE ON maintenances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE maintenances ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_photos ENABLE ROW LEVEL SECURITY;

-- Policies: members only (no guests)
CREATE POLICY "Members view maintenances" ON maintenances FOR SELECT
  USING (is_home_member(home_id, auth.uid()) AND get_home_role(home_id, auth.uid()) != 'guest');

CREATE POLICY "Members create maintenances" ON maintenances FOR INSERT
  WITH CHECK (is_home_member(home_id, auth.uid()) AND get_home_role(home_id, auth.uid()) IN ('owner','admin','member'));

CREATE POLICY "Authorized edit maintenances" ON maintenances FOR UPDATE
  USING (created_by = auth.uid() OR get_home_role(home_id, auth.uid()) IN ('owner','admin'));

CREATE POLICY "Authorized delete maintenances" ON maintenances FOR DELETE
  USING (created_by = auth.uid() OR get_home_role(home_id, auth.uid()) IN ('owner','admin'));

CREATE POLICY "Members access notes" ON maintenance_notes FOR ALL
  USING (EXISTS (SELECT 1 FROM maintenances m WHERE m.id = maintenance_id AND is_home_member(m.home_id, auth.uid()) AND get_home_role(m.home_id, auth.uid()) != 'guest'));

CREATE POLICY "Members access photos" ON maintenance_photos FOR ALL
  USING (EXISTS (SELECT 1 FROM maintenances m WHERE m.id = maintenance_id AND is_home_member(m.home_id, auth.uid()) AND get_home_role(m.home_id, auth.uid()) != 'guest'));

-- Trigger: Log status change as activity
CREATE OR REPLACE FUNCTION handle_maintenance_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO activity_entries (home_id, user_id, action, entity_type, entity_id, metadata)
    VALUES (
      NEW.home_id,
      COALESCE(NEW.completed_by, NEW.created_by),
      NEW.status,
      'maintenance',
      NEW.id,
      jsonb_build_object('title', NEW.title, 'priority', NEW.priority::text, 'from_status', OLD.status::text)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_maintenance_status_change
  AFTER UPDATE ON maintenances
  FOR EACH ROW EXECUTE FUNCTION handle_maintenance_status_change();
