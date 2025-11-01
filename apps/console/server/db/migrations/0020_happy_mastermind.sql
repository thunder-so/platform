-- ALTER TABLE "users" DROP CONSTRAINT "users_email_unique";

-- Drop existing membership view policy
DROP POLICY IF EXISTS "View own memberships" ON memberships;

-- Create new policy to allow viewing all memberships in organizations where user is a member
CREATE POLICY "View memberships in org" ON memberships
  FOR SELECT USING (
    user_id = auth.uid() OR 
    organization_id IN (
      SELECT organization_id FROM memberships 
      WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );