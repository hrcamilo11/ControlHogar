-- Temporary invite codes for homes (6-char hex, auto-expire in 7 days)

CREATE TABLE IF NOT EXISTS home_invite_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES profiles(id),
  expires_at TIMESTAMPTZ NOT NULL,
  max_uses INTEGER DEFAULT 10,
  uses INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON home_invite_codes(code) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_invite_codes_home ON home_invite_codes(home_id);

-- RLS
ALTER TABLE home_invite_codes ENABLE ROW LEVEL SECURITY;

-- Members can view codes for their home
CREATE POLICY "Members view home codes" ON home_invite_codes FOR SELECT
  USING (is_home_member(home_id, auth.uid()));

-- Admins/owners can manage codes
CREATE POLICY "Admins manage codes" ON home_invite_codes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM home_members
      WHERE home_id = home_invite_codes.home_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- Anyone can read a code by its value (for joining)
CREATE POLICY "Anyone can lookup code" ON home_invite_codes FOR SELECT
  USING (is_active = true AND expires_at > now() AND uses < max_uses);

-- Function to join home by invite code
CREATE OR REPLACE FUNCTION join_home_by_code(p_code TEXT)
RETURNS JSONB AS $$
DECLARE
  v_invite home_invite_codes%ROWTYPE;
  v_home_name TEXT;
  v_existing BOOLEAN;
BEGIN
  -- Find active code
  SELECT * INTO v_invite FROM home_invite_codes
  WHERE code = UPPER(p_code) AND is_active = true AND expires_at > now() AND uses < max_uses;

  IF v_invite IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Código inválido o expirado');
  END IF;

  -- Check if already a member
  SELECT EXISTS(SELECT 1 FROM home_members WHERE home_id = v_invite.home_id AND user_id = auth.uid()) INTO v_existing;
  IF v_existing THEN
    SELECT name INTO v_home_name FROM homes WHERE id = v_invite.home_id;
    RETURN jsonb_build_object('success', true, 'home_name', v_home_name, 'already_member', true);
  END IF;

  -- Add as member
  INSERT INTO home_members (home_id, user_id, role) VALUES (v_invite.home_id, auth.uid(), 'member');

  -- Increment uses
  UPDATE home_invite_codes SET uses = uses + 1 WHERE id = v_invite.id;

  -- Get home name
  SELECT name INTO v_home_name FROM homes WHERE id = v_invite.home_id;

  RETURN jsonb_build_object('success', true, 'home_name', v_home_name, 'home_id', v_invite.home_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
