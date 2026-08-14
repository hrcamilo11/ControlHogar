-- Allow users to delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON app_notifications FOR DELETE
  USING (user_id = auth.uid());
