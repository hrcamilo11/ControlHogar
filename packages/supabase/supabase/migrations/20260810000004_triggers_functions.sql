-- ControlHogar: Triggers and Database Functions

-- Function: Create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, email_verified)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'email_verified')::boolean, FALSE)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function: Create default notification preferences when joining a home
CREATE OR REPLACE FUNCTION handle_new_member()
RETURNS TRIGGER AS $$
BEGIN
  -- Create default preferences for all categories
  INSERT INTO notification_preferences (user_id, category, push_enabled, email_enabled, in_app_enabled)
  VALUES
    (NEW.user_id, 'tasks', TRUE, TRUE, TRUE),
    (NEW.user_id, 'finance', TRUE, TRUE, TRUE),
    (NEW.user_id, 'maintenance', TRUE, TRUE, TRUE),
    (NEW.user_id, 'home', TRUE, TRUE, TRUE)
  ON CONFLICT (user_id, category) DO NOTHING;

  -- Log activity
  INSERT INTO activity_entries (home_id, user_id, action, entity_type, entity_id, metadata)
  VALUES (
    NEW.home_id,
    NEW.user_id,
    'joined',
    'member',
    NEW.id,
    jsonb_build_object('role', NEW.role::text)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_member_joined
  AFTER INSERT ON home_members
  FOR EACH ROW EXECUTE FUNCTION handle_new_member();

-- Function: Log member removal activity
CREATE OR REPLACE FUNCTION handle_member_removed()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO activity_entries (home_id, user_id, action, entity_type, entity_id, metadata)
  VALUES (
    OLD.home_id,
    OLD.user_id,
    'removed',
    'member',
    OLD.id,
    jsonb_build_object('role', OLD.role::text)
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_member_removed
  AFTER DELETE ON home_members
  FOR EACH ROW EXECUTE FUNCTION handle_member_removed();

-- Function: Auto-create owner membership when home is created
CREATE OR REPLACE FUNCTION handle_home_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO home_members (home_id, user_id, role)
  VALUES (NEW.id, NEW.created_by, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_home_created
  AFTER INSERT ON homes
  FOR EACH ROW EXECUTE FUNCTION handle_home_created();

-- Function: Validate home member limits
CREATE OR REPLACE FUNCTION check_home_member_limit()
RETURNS TRIGGER AS $$
DECLARE
  member_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO member_count
  FROM home_members WHERE home_id = NEW.home_id;

  IF member_count >= 20 THEN
    RAISE EXCEPTION 'Home has reached maximum member limit (20)';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_home_member_limit
  BEFORE INSERT ON home_members
  FOR EACH ROW EXECUTE FUNCTION check_home_member_limit();

-- Function: Validate user home limit
CREATE OR REPLACE FUNCTION check_user_home_limit()
RETURNS TRIGGER AS $$
DECLARE
  home_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO home_count
  FROM home_members hm
  JOIN homes h ON h.id = hm.home_id
  WHERE hm.user_id = NEW.user_id AND h.is_active = TRUE;

  IF home_count >= 5 THEN
    RAISE EXCEPTION 'User has reached maximum home limit (5)';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_user_home_limit
  BEFORE INSERT ON home_members
  FOR EACH ROW EXECUTE FUNCTION check_user_home_limit();
