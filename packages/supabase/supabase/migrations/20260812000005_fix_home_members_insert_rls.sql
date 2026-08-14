-- Allow authenticated users to insert themselves as member (for accepting invitations)
-- The application validates the invitation token before allowing this
CREATE POLICY "Users can add themselves as member"
  ON home_members FOR INSERT
  WITH CHECK (user_id = auth.uid());
