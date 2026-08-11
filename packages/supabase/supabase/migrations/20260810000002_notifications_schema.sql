-- ControlHogar: Notifications and Activity Schema
-- Tables: user_devices, app_notifications, activity_entries, notification_preferences

-- User devices for push notifications
CREATE TABLE user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  push_token TEXT NOT NULL,
  platform device_platform NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, push_token)
);

-- App notifications (in-app)
CREATE TABLE app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  home_id UUID REFERENCES homes(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL CHECK (char_length(title) <= 200),
  body TEXT NOT NULL CHECK (char_length(body) <= 500),
  data JSONB,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Activity entries (feed)
CREATE TABLE activity_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notification preferences
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category notification_category NOT NULL,
  push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(user_id, category)
);

-- Indexes
CREATE INDEX idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX idx_app_notifications_user_id ON app_notifications(user_id);
CREATE INDEX idx_app_notifications_unread ON app_notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_activity_entries_home_id ON activity_entries(home_id);
CREATE INDEX idx_activity_entries_created_at ON activity_entries(home_id, created_at DESC);
CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);

-- Updated_at trigger for user_devices
CREATE TRIGGER set_user_devices_updated_at
  BEFORE UPDATE ON user_devices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
