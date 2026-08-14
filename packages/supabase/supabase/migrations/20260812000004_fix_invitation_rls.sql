-- Allow any authenticated user to read an invitation by token (needed to accept invitations)
-- The token acts as a secret - knowing it proves you were invited
CREATE POLICY "Anyone can read invitation by token"
  ON invitations FOR SELECT
  USING (auth.role() = 'authenticated');

-- Allow any authenticated user to update invitation (to mark as accepted)
-- The application logic validates the token and expiry
CREATE POLICY "Authenticated users can accept invitations"
  ON invitations FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
