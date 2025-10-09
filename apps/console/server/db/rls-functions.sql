-- Helper functions for RLS policies

-- Function to check if user has specific access level in organization
CREATE OR REPLACE FUNCTION user_has_org_access(org_id text, required_access account_access)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM memberships 
    WHERE user_id = auth.uid() 
    AND organization_id = org_id 
    AND access >= required_access 
    AND deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's organizations
CREATE OR REPLACE FUNCTION user_organizations()
RETURNS TABLE(organization_id text) AS $$
BEGIN
  RETURN QUERY
  SELECT m.organization_id 
  FROM memberships m
  WHERE m.user_id = auth.uid() 
  AND m.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can access service
CREATE OR REPLACE FUNCTION user_can_access_service(service_id text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM services s
    JOIN environments e ON s.environment_id = e.id
    JOIN applications a ON e.application_id = a.id
    JOIN memberships m ON a.organization_id = m.organization_id
    WHERE s.id = service_id
    AND m.user_id = auth.uid()
    AND m.deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;