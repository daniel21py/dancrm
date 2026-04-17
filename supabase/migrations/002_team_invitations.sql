-- Migration 002: Team invitations
-- Add profile columns to tenant_members, create invitations table and join function

-- ─── New columns on tenant_members ───────────────────────────────────────────
ALTER TABLE tenant_members
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS monthly_target numeric(15,2),
  ADD COLUMN IF NOT EXISTS commission_pct numeric(5,2),
  ADD COLUMN IF NOT EXISTS assigned_area text;

-- Allow admins to update other members' details within the same tenant
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'tenant_members' AND policyname = 'members_update_by_admin'
  ) THEN
    CREATE POLICY "members_update_by_admin" ON tenant_members
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM tenant_members tm
          WHERE tm.user_id = auth.uid()
            AND tm.tenant_id = tenant_members.tenant_id
            AND tm.role IN ('owner', 'admin')
        )
      );
  END IF;
END;
$$;

-- ─── Invitations table ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invitations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code         text UNIQUE NOT NULL,
  role         member_role NOT NULL DEFAULT 'sales',
  email        text,
  used_by      uuid REFERENCES auth.users(id),
  used_at      timestamptz,
  expires_at   timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_by   uuid REFERENCES auth.users(id),
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Admins of the tenant can read their invitations
CREATE POLICY "invitations_select" ON invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.tenant_id = invitations.tenant_id
        AND tm.role IN ('owner', 'admin')
    )
  );

-- Admins can create invitations
CREATE POLICY "invitations_insert" ON invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.tenant_id = invitations.tenant_id
        AND tm.role IN ('owner', 'admin')
    )
  );

-- Admins can update invitations (e.g., revoke by setting used_at manually)
CREATE POLICY "invitations_update" ON invitations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.tenant_id = invitations.tenant_id
        AND tm.role IN ('owner', 'admin')
    )
  );

-- Admins can delete invitations
CREATE POLICY "invitations_delete" ON invitations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM tenant_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.tenant_id = invitations.tenant_id
        AND tm.role IN ('owner', 'admin')
    )
  );

-- ─── join_tenant_with_invite ──────────────────────────────────────────────────
-- SECURITY DEFINER: bypasses RLS so a brand-new user (not yet a tenant_member)
-- can validate and consume an invite code and become a member.
CREATE OR REPLACE FUNCTION join_tenant_with_invite(
  p_invite_code text,
  p_full_name   text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite      invitations%ROWTYPE;
  v_member_id   uuid;
  v_user_email  text;
BEGIN
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = auth.uid();

  -- Find a valid, unused invite
  SELECT * INTO v_invite
  FROM invitations
  WHERE code = upper(p_invite_code)
    AND used_at IS NULL
    AND expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Codice invito non valido o scaduto';
  END IF;

  -- Enforce email restriction when set
  IF v_invite.email IS NOT NULL AND lower(v_invite.email) != lower(v_user_email) THEN
    RAISE EXCEPTION 'Questo codice invito è riservato a un''altra email';
  END IF;

  -- Prevent duplicate membership
  IF EXISTS (
    SELECT 1 FROM tenant_members
    WHERE tenant_id = v_invite.tenant_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Sei già membro di questo workspace';
  END IF;

  -- Create member record
  INSERT INTO tenant_members (tenant_id, user_id, role, full_name, joined_at)
  VALUES (v_invite.tenant_id, auth.uid(), v_invite.role, p_full_name, now())
  RETURNING id INTO v_member_id;

  -- Consume the invite
  UPDATE invitations
  SET used_by = auth.uid(), used_at = now()
  WHERE id = v_invite.id;

  RETURN v_member_id;
END;
$$;
