-- =============================================
-- Fix RLS Recursion in memberships table
-- Adds helper view + non-recursive policies
-- Safe to run multiple times
-- =============================================

-- 1. Create helper view: user's active organizations
DROP VIEW IF EXISTS v_user_organizations CASCADE;

CREATE VIEW v_user_organizations AS
SELECT DISTINCT m.organization_id
FROM memberships m
WHERE m.user_id = auth.uid()
  AND m.deleted_at IS NULL;

-- Grant access to authenticated users
GRANT SELECT ON v_user_organizations TO authenticated;

-- Optional: index for performance (if not already exists)
CREATE INDEX IF NOT EXISTS idx_memberships_user_org_active
ON memberships (user_id, organization_id)
WHERE deleted_at IS NULL;

-- 3. Recreate improved policies for memberships
-- Users can view ALL members in orgs they belong to
DROP POLICY IF EXISTS "View organization members" ON memberships;

CREATE POLICY "View organization members"
ON memberships FOR SELECT
USING (
  deleted_at IS NULL
  AND organization_id IN (SELECT organization_id FROM v_user_organizations)
);

-- Users can only insert their own membership (invites/requests)
DROP POLICY IF EXISTS "Insert own memberships" ON memberships;

CREATE POLICY "Insert own memberships"
ON memberships FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND deleted_at IS NULL
);

-- Users can update their own membership (e.g. accept invite, leave)
DROP POLICY IF EXISTS "Update own memberships" ON memberships;

CREATE POLICY "Update own memberships"
ON memberships FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users can delete their own membership
DROP POLICY IF EXISTS "Delete own memberships" ON memberships;

CREATE POLICY "Delete own memberships"
ON memberships FOR DELETE
USING (user_id = auth.uid());

-- 4. Update Users table policies to use the view (more consistent)

DROP POLICY IF EXISTS "Users can view own profile" ON users;

CREATE POLICY "View user profiles via membership or self"
ON users FOR SELECT
USING (
  auth.uid() = id
  OR id IN (
    SELECT m.user_id
    FROM memberships m
    WHERE m.organization_id IN (SELECT organization_id FROM v_user_organizations)
      AND m.deleted_at IS NULL
  )
);

-- Keep update policy
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
USING (auth.uid() = id);

-- 5. Update Organizations policies to use the view (optional but cleaner)
DROP POLICY IF EXISTS "View organizations through membership" ON organizations;

CREATE POLICY "View organizations through membership"
ON organizations FOR SELECT
USING (
  deleted_at IS NULL
  AND id IN (SELECT organization_id FROM v_user_organizations)
);

-- Keep update policy (already good)
DROP POLICY IF EXISTS "Update organizations as owner/admin" ON organizations;

CREATE POLICY "Update organizations as owner/admin" ON organizations
  FOR UPDATE USING (
    id IN (
      SELECT organization_id FROM memberships 
      WHERE user_id = auth.uid() AND access IN ('OWNER', 'ADMIN') AND deleted_at IS NULL
    )
  );
