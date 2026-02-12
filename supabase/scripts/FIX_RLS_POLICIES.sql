-- ============================================
-- Fix RLS Policies for User Profile Access
-- ============================================
-- Issue: Platform owners and users can't fetch their own profile
-- Solution: Add policy to allow users to view their own record

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view users in their organization" ON users;

-- Create TWO policies for SELECT:
-- 1. Users can always view their own profile
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

-- 2. Users can view other users in their organization
CREATE POLICY "Users can view users in their organization"
  ON users FOR SELECT
  USING (
    org_id IS NOT NULL 
    AND org_id IN (SELECT org_id FROM users WHERE users.id = auth.uid() AND org_id IS NOT NULL)
  );

-- Verify policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'users'
  AND cmd = 'SELECT'
ORDER BY policyname;

-- You should now see two SELECT policies:
-- 1. "Users can view their own profile"
-- 2. "Users can view users in their organization"
