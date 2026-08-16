-- Allow any member (not guest) to update maintenance status
-- The existing policy only allows creator/admin/owner to update
-- We need members to be able to advance status (start/complete)
DROP POLICY IF EXISTS "Authorized edit maintenances" ON maintenances;

CREATE POLICY "Members can update maintenances"
  ON maintenances FOR UPDATE
  USING (
    is_home_member(home_id, auth.uid()) 
    AND get_home_role(home_id, auth.uid()) IN ('owner', 'admin', 'member')
  );
