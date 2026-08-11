-- ControlHogar: Row Level Security Policies
-- All tables default DENY, explicit policies grant access

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE homes ENABLE ROW LEVEL SECURITY;
ALTER TABLE home_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Helper function: check if user is member of a home
CREATE OR REPLACE FUNCTION is_home_member(p_home_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM home_members
    WHERE home_id = p_home_id AND user_id = p_user_id
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: get user's role in a home
CREATE OR REPLACE FUNCTION get_home_role(p_home_id UUID, p_user_id UUID)
RETURNS user_role AS $$
  SELECT role FROM home_members
  WHERE home_id = p_home_id AND user_id = p_user_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- PROFILES policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can view profiles of home co-members"
  ON profiles FOR SELECT
  USING (
    id IN (
      SELECT hm.user_id FROM home_members hm
      WHERE hm.home_id IN (
        SELECT home_id FROM home_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- HOMES policies
CREATE POLICY "Members can view their homes"
  ON homes FOR SELECT
  USING (is_home_member(id, auth.uid()));

CREATE POLICY "Verified users can create homes"
  ON homes FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND (SELECT email_verified FROM profiles WHERE id = auth.uid()) = TRUE
    AND (SELECT COUNT(*) FROM home_members WHERE user_id = auth.uid()) < 5
  );

CREATE POLICY "Owner and admin can update home"
  ON homes FOR UPDATE
  USING (get_home_role(id, auth.uid()) IN ('owner', 'admin'))
  WITH CHECK (get_home_role(id, auth.uid()) IN ('owner', 'admin'));

-- HOME_MEMBERS policies
CREATE POLICY "Members can view co-members"
  ON home_members FOR SELECT
  USING (is_home_member(home_id, auth.uid()));

CREATE POLICY "Owner and admin can manage members"
  ON home_members FOR DELETE
  USING (get_home_role(home_id, auth.uid()) IN ('owner', 'admin'));

CREATE POLICY "Owner and admin can update roles"
  ON home_members FOR UPDATE
  USING (get_home_role(home_id, auth.uid()) IN ('owner', 'admin'))
  WITH CHECK (get_home_role(home_id, auth.uid()) IN ('owner', 'admin'));

-- INVITATIONS policies
CREATE POLICY "Admin and owner can view invitations"
  ON invitations FOR SELECT
  USING (get_home_role(home_id, auth.uid()) IN ('owner', 'admin'));

CREATE POLICY "Admin and owner can create invitations"
  ON invitations FOR INSERT
  WITH CHECK (get_home_role(home_id, auth.uid()) IN ('owner', 'admin'));

CREATE POLICY "Admin and owner can revoke invitations"
  ON invitations FOR UPDATE
  USING (get_home_role(home_id, auth.uid()) IN ('owner', 'admin'))
  WITH CHECK (get_home_role(home_id, auth.uid()) IN ('owner', 'admin'));

-- USER_DEVICES policies
CREATE POLICY "Users manage own devices"
  ON user_devices FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- APP_NOTIFICATIONS policies
CREATE POLICY "Users view own notifications"
  ON app_notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can mark own notifications as read"
  ON app_notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ACTIVITY_ENTRIES policies
CREATE POLICY "Members can view home activity"
  ON activity_entries FOR SELECT
  USING (is_home_member(home_id, auth.uid()));

-- NOTIFICATION_PREFERENCES policies
CREATE POLICY "Users manage own preferences"
  ON notification_preferences FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
