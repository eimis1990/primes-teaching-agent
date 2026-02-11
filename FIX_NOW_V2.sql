-- Just drop and recreate all SELECT policies on users table

DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can view users in their organization" ON users;

-- Policy 1: Users can ALWAYS view their own profile
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

-- Policy 2: Users can view other users in their organization
CREATE POLICY "Users can view users in their organization"
  ON users FOR SELECT
  USING (
    org_id IS NOT NULL 
    AND org_id IN (SELECT org_id FROM users WHERE users.id = auth.uid() AND org_id IS NOT NULL)
  );

-- Done! Refresh your browser (F5)
