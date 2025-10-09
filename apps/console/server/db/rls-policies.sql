-- Thunder Platform Row Level Security Policies
-- Enable RLS on all tables

-- Core Tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE installations ENABLE ROW LEVEL SECURITY;

-- Payment Tables
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Platform Infrastructure Tables
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE environments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_variables ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE domains ENABLE ROW LEVEL SECURITY;

-- Build and Deploy Tables
ALTER TABLE builds ENABLE ROW LEVEL SECURITY;
ALTER TABLE destroys ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Notification Tables
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users: Can only access their own record
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Organizations: Access through membership
CREATE POLICY "View organizations through membership" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT organization_id FROM memberships 
      WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );

CREATE POLICY "Update organizations as owner/admin" ON organizations
  FOR UPDATE USING (
    id IN (
      SELECT organization_id FROM memberships 
      WHERE user_id = auth.uid() AND access IN ('OWNER', 'ADMIN') AND deleted_at IS NULL
    )
  );

-- Memberships: View own memberships and org memberships if admin+
CREATE POLICY "View own memberships" ON memberships
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "View org memberships as admin" ON memberships
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM memberships 
      WHERE user_id = auth.uid() AND access IN ('OWNER', 'ADMIN') AND deleted_at IS NULL
    )
  );

CREATE POLICY "Manage memberships as owner" ON memberships
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM memberships 
      WHERE user_id = auth.uid() AND access = 'OWNER' AND deleted_at IS NULL
    )
  );

-- Installations: Own installations only
CREATE POLICY "View own installations" ON installations
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Manage own installations" ON installations
  FOR ALL USING (user_id = auth.uid());

-- Products: Public read access
CREATE POLICY "Public read access to products" ON products
  FOR SELECT USING (active = true);

-- Customers: Organization members only
CREATE POLICY "View customers in org" ON customers
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM memberships 
      WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );

-- Subscriptions: Organization members only
CREATE POLICY "View subscriptions in org" ON subscriptions
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM memberships 
      WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );

CREATE POLICY "Manage subscriptions as owner/admin" ON subscriptions
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM memberships 
      WHERE user_id = auth.uid() AND access IN ('OWNER', 'ADMIN') AND deleted_at IS NULL
    )
  );

-- Providers: Organization access with read/write permissions
CREATE POLICY "View providers in org" ON providers
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM memberships 
      WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );

CREATE POLICY "Manage providers with write access" ON providers
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM memberships 
      WHERE user_id = auth.uid() AND access IN ('OWNER', 'ADMIN', 'READ_WRITE') AND deleted_at IS NULL
    )
  );

-- Applications: Organization access
CREATE POLICY "View applications in org" ON applications
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM memberships 
      WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );

CREATE POLICY "Manage applications with write access" ON applications
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM memberships 
      WHERE user_id = auth.uid() AND access IN ('OWNER', 'ADMIN', 'READ_WRITE') AND deleted_at IS NULL
    )
  );

-- Environments: Through application access
CREATE POLICY "View environments through app" ON environments
  FOR SELECT USING (
    application_id IN (
      SELECT id FROM applications 
      WHERE organization_id IN (
        SELECT organization_id FROM memberships 
        WHERE user_id = auth.uid() AND deleted_at IS NULL
      )
    )
  );

CREATE POLICY "Manage environments with write access" ON environments
  FOR ALL USING (
    application_id IN (
      SELECT id FROM applications 
      WHERE organization_id IN (
        SELECT organization_id FROM memberships 
        WHERE user_id = auth.uid() AND access IN ('OWNER', 'ADMIN', 'READ_WRITE') AND deleted_at IS NULL
      )
    )
  );

-- User Access Tokens: Own tokens only
CREATE POLICY "View own access tokens" ON user_access_tokens
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Manage own access tokens" ON user_access_tokens
  FOR ALL USING (user_id = auth.uid());

-- Services: Through environment access
CREATE POLICY "View services through env" ON services
  FOR SELECT USING (
    environment_id IN (
      SELECT id FROM environments 
      WHERE application_id IN (
        SELECT id FROM applications 
        WHERE organization_id IN (
          SELECT organization_id FROM memberships 
          WHERE user_id = auth.uid() AND deleted_at IS NULL
        )
      )
    )
  );

CREATE POLICY "Manage services with write access" ON services
  FOR ALL USING (
    environment_id IN (
      SELECT id FROM environments 
      WHERE application_id IN (
        SELECT id FROM applications 
        WHERE organization_id IN (
          SELECT organization_id FROM memberships 
          WHERE user_id = auth.uid() AND access IN ('OWNER', 'ADMIN', 'READ_WRITE') AND deleted_at IS NULL
        )
      )
    )
  );

-- Service Variables: Through service access
CREATE POLICY "View service variables" ON service_variables
  FOR SELECT USING (
    service_id IN (
      SELECT id FROM services 
      WHERE environment_id IN (
        SELECT id FROM environments 
        WHERE application_id IN (
          SELECT id FROM applications 
          WHERE organization_id IN (
            SELECT organization_id FROM memberships 
            WHERE user_id = auth.uid() AND deleted_at IS NULL
          )
        )
      )
    )
  );

CREATE POLICY "Manage service variables with write access" ON service_variables
  FOR ALL USING (
    service_id IN (
      SELECT id FROM services 
      WHERE environment_id IN (
        SELECT id FROM environments 
        WHERE application_id IN (
          SELECT id FROM applications 
          WHERE organization_id IN (
            SELECT organization_id FROM memberships 
            WHERE user_id = auth.uid() AND access IN ('OWNER', 'ADMIN', 'READ_WRITE') AND deleted_at IS NULL
          )
        )
      )
    )
  );

-- Service Secrets: Through service access (admin+ only for secrets)
CREATE POLICY "View service secrets as admin" ON service_secrets
  FOR SELECT USING (
    service_id IN (
      SELECT id FROM services 
      WHERE environment_id IN (
        SELECT id FROM environments 
        WHERE application_id IN (
          SELECT id FROM applications 
          WHERE organization_id IN (
            SELECT organization_id FROM memberships 
            WHERE user_id = auth.uid() AND access IN ('OWNER', 'ADMIN') AND deleted_at IS NULL
          )
        )
      )
    )
  );

CREATE POLICY "Manage service secrets as admin" ON service_secrets
  FOR ALL USING (
    service_id IN (
      SELECT id FROM services 
      WHERE environment_id IN (
        SELECT id FROM environments 
        WHERE application_id IN (
          SELECT id FROM applications 
          WHERE organization_id IN (
            SELECT organization_id FROM memberships 
            WHERE user_id = auth.uid() AND access IN ('OWNER', 'ADMIN') AND deleted_at IS NULL
          )
        )
      )
    )
  );

-- Domains: Through service access
CREATE POLICY "View domains through service" ON domains
  FOR SELECT USING (
    service_id IN (
      SELECT id FROM services 
      WHERE environment_id IN (
        SELECT id FROM environments 
        WHERE application_id IN (
          SELECT id FROM applications 
          WHERE organization_id IN (
            SELECT organization_id FROM memberships 
            WHERE user_id = auth.uid() AND deleted_at IS NULL
          )
        )
      )
    )
  );

CREATE POLICY "Manage domains with write access" ON domains
  FOR ALL USING (
    service_id IN (
      SELECT id FROM services 
      WHERE environment_id IN (
        SELECT id FROM environments 
        WHERE application_id IN (
          SELECT id FROM applications 
          WHERE organization_id IN (
            SELECT organization_id FROM memberships 
            WHERE user_id = auth.uid() AND access IN ('OWNER', 'ADMIN', 'READ_WRITE') AND deleted_at IS NULL
          )
        )
      )
    )
  );

-- Builds: Through service access
CREATE POLICY "View builds through service" ON builds
  FOR SELECT USING (
    service_id IN (
      SELECT id FROM services 
      WHERE environment_id IN (
        SELECT id FROM environments 
        WHERE application_id IN (
          SELECT id FROM applications 
          WHERE organization_id IN (
            SELECT organization_id FROM memberships 
            WHERE user_id = auth.uid() AND deleted_at IS NULL
          )
        )
      )
    )
  );

-- Destroys: Through service access (admin+ only)
CREATE POLICY "View destroys as admin" ON destroys
  FOR SELECT USING (
    service_id IN (
      SELECT id FROM services 
      WHERE environment_id IN (
        SELECT id FROM environments 
        WHERE application_id IN (
          SELECT id FROM applications 
          WHERE organization_id IN (
            SELECT organization_id FROM memberships 
            WHERE user_id = auth.uid() AND access IN ('OWNER', 'ADMIN') AND deleted_at IS NULL
          )
        )
      )
    )
  );

-- Events: Through service access
CREATE POLICY "View events through service" ON events
  FOR SELECT USING (
    service_id IN (
      SELECT id FROM services 
      WHERE environment_id IN (
        SELECT id FROM environments 
        WHERE application_id IN (
          SELECT id FROM applications 
          WHERE organization_id IN (
            SELECT organization_id FROM memberships 
            WHERE user_id = auth.uid() AND deleted_at IS NULL
          )
        )
      )
    )
  );

-- Notifications: Organization access
CREATE POLICY "View notifications in org" ON notifications
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM memberships 
      WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );

CREATE POLICY "Manage notifications as admin" ON notifications
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM memberships 
      WHERE user_id = auth.uid() AND access IN ('OWNER', 'ADMIN') AND deleted_at IS NULL
    )
  );