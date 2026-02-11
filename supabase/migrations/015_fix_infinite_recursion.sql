-- ============================================
-- FIX INFINITE RECURSION IN USERS RLS POLICIES
-- Migration: 015_fix_infinite_recursion.sql
-- Description: Fixes infinite recursion by using security definer functions
-- ============================================

-- Create a security definer function to get user's org_id
-- This function bypasses RLS so it won't cause recursion
CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT org_id 
    FROM public.users 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create a security definer function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role = 'admin'
    FROM public.users 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create a security definer function to get user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role::TEXT
    FROM public.users 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create a function to check if user is platform owner
-- Note: Platform owner check is done at API level, so we allow authenticated users to insert
-- The API endpoint validates the platform owner email
CREATE OR REPLACE FUNCTION public.can_manage_platform()
RETURNS BOOLEAN AS $$
BEGIN
  -- Allow any authenticated user to insert - API layer handles platform owner validation
  -- This is necessary because we can't access environment variables in SQL
  RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- DROP OLD POLICIES
-- ============================================

DROP POLICY IF EXISTS "Users can view their organization" ON organizations;
DROP POLICY IF EXISTS "Org admins can update their organization" ON organizations;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can view users in their organization" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Org admins can update users in their organization" ON users;
DROP POLICY IF EXISTS "Org admins can view invites for their organization" ON invites;
DROP POLICY IF EXISTS "Org admins can create invites for their organization" ON invites;
DROP POLICY IF EXISTS "Org admins can update invites for their organization" ON invites;
DROP POLICY IF EXISTS "Org admins can delete invites for their organization" ON invites;
DROP POLICY IF EXISTS "Users can view topics in their organization" ON topics;
DROP POLICY IF EXISTS "Org admins can insert topics in their organization" ON topics;
DROP POLICY IF EXISTS "Org admins can update topics in their organization" ON topics;
DROP POLICY IF EXISTS "Org admins can delete topics in their organization" ON topics;
DROP POLICY IF EXISTS "Users can view documents in their organization" ON documents;
DROP POLICY IF EXISTS "Org admins can insert documents in their organization" ON documents;
DROP POLICY IF EXISTS "Org admins can update documents in their organization" ON documents;
DROP POLICY IF EXISTS "Org admins can delete documents in their organization" ON documents;
DROP POLICY IF EXISTS "Users can view embeddings in their organization" ON document_embeddings;
DROP POLICY IF EXISTS "Org admins can insert embeddings in their organization" ON document_embeddings;
DROP POLICY IF EXISTS "Org admins can delete embeddings in their organization" ON document_embeddings;
DROP POLICY IF EXISTS "Users can view conversations in their organization" ON conversations;
DROP POLICY IF EXISTS "Users can insert conversations in their organization" ON conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can delete their own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view assessment types in their organization" ON assessment_types;
DROP POLICY IF EXISTS "Org admins can insert assessment types in their organization" ON assessment_types;
DROP POLICY IF EXISTS "Org admins can update assessment types in their organization" ON assessment_types;
DROP POLICY IF EXISTS "Org admins can delete assessment types in their organization" ON assessment_types;
DROP POLICY IF EXISTS "Users can view assessments in their organization" ON assessments;
DROP POLICY IF EXISTS "Org admins can insert assessments in their organization" ON assessments;
DROP POLICY IF EXISTS "Org admins can update assessments in their organization" ON assessments;
DROP POLICY IF EXISTS "Employees can update their own assessments" ON assessments;
DROP POLICY IF EXISTS "Org admins can delete assessments in their organization" ON assessments;
DROP POLICY IF EXISTS "Users can view question banks in their organization" ON question_banks;
DROP POLICY IF EXISTS "Org admins can insert question banks in their organization" ON question_banks;
DROP POLICY IF EXISTS "Org admins can update question banks in their organization" ON question_banks;
DROP POLICY IF EXISTS "Org admins can delete question banks in their organization" ON question_banks;
DROP POLICY IF EXISTS "Users can view question library in their organization" ON question_library;
DROP POLICY IF EXISTS "Org admins can insert question library in their organization" ON question_library;
DROP POLICY IF EXISTS "Org admins can update question library in their organization" ON question_library;
DROP POLICY IF EXISTS "Org admins can delete question library in their organization" ON question_library;

-- ============================================
-- RECREATE POLICIES USING HELPER FUNCTIONS
-- ============================================

-- Organizations RLS
CREATE POLICY "Users can view their organization"
  ON organizations FOR SELECT
  USING (id = public.get_user_org_id());

CREATE POLICY "Platform owner can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (public.can_manage_platform());

CREATE POLICY "Platform owner can update any organization"
  ON organizations FOR UPDATE
  USING (public.can_manage_platform());

CREATE POLICY "Org admins can update their organization"
  ON organizations FOR UPDATE
  USING (id = public.get_user_org_id() AND public.is_user_admin());

-- Users RLS
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can view users in their organization"
  ON users FOR SELECT
  USING (
    org_id IS NOT NULL 
    AND org_id = public.get_user_org_id()
  );

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Org admins can update users in their organization"
  ON users FOR UPDATE
  USING (org_id = public.get_user_org_id() AND public.is_user_admin());

-- Invites RLS
CREATE POLICY "Org admins can view invites for their organization"
  ON invites FOR SELECT
  USING (org_id = public.get_user_org_id() AND public.is_user_admin());

CREATE POLICY "Org admins can create invites for their organization"
  ON invites FOR INSERT
  WITH CHECK (org_id = public.get_user_org_id() AND public.is_user_admin());

CREATE POLICY "Org admins can update invites for their organization"
  ON invites FOR UPDATE
  USING (org_id = public.get_user_org_id() AND public.is_user_admin());

CREATE POLICY "Org admins can delete invites for their organization"
  ON invites FOR DELETE
  USING (org_id = public.get_user_org_id() AND public.is_user_admin());

-- Topics RLS
CREATE POLICY "Users can view topics in their organization"
  ON topics FOR SELECT
  USING (org_id = public.get_user_org_id());

CREATE POLICY "Org admins can insert topics in their organization"
  ON topics FOR INSERT
  WITH CHECK (org_id = public.get_user_org_id() AND public.is_user_admin());

CREATE POLICY "Org admins can update topics in their organization"
  ON topics FOR UPDATE
  USING (org_id = public.get_user_org_id() AND public.is_user_admin());

CREATE POLICY "Org admins can delete topics in their organization"
  ON topics FOR DELETE
  USING (org_id = public.get_user_org_id() AND public.is_user_admin());

-- Documents RLS
CREATE POLICY "Users can view documents in their organization"
  ON documents FOR SELECT
  USING (org_id = public.get_user_org_id());

CREATE POLICY "Org admins can insert documents in their organization"
  ON documents FOR INSERT
  WITH CHECK (org_id = public.get_user_org_id() AND public.is_user_admin());

CREATE POLICY "Org admins can update documents in their organization"
  ON documents FOR UPDATE
  USING (org_id = public.get_user_org_id() AND public.is_user_admin());

CREATE POLICY "Org admins can delete documents in their organization"
  ON documents FOR DELETE
  USING (org_id = public.get_user_org_id() AND public.is_user_admin());

-- Document Embeddings RLS
-- Note: We keep user_id check since embeddings are per-user
CREATE POLICY "Users can view embeddings in their organization"
  ON document_embeddings FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM users 
      WHERE org_id = public.get_user_org_id()
    )
  );

CREATE POLICY "Org admins can insert embeddings in their organization"
  ON document_embeddings FOR INSERT
  WITH CHECK (
    public.is_user_admin() AND
    user_id IN (
      SELECT id FROM users 
      WHERE org_id = public.get_user_org_id()
    )
  );

CREATE POLICY "Org admins can delete embeddings in their organization"
  ON document_embeddings FOR DELETE
  USING (
    public.is_user_admin() AND
    user_id IN (
      SELECT id FROM users 
      WHERE org_id = public.get_user_org_id()
    )
  );

-- Conversations RLS
CREATE POLICY "Users can view conversations in their organization"
  ON conversations FOR SELECT
  USING (org_id = public.get_user_org_id());

CREATE POLICY "Users can insert conversations in their organization"
  ON conversations FOR INSERT
  WITH CHECK (org_id = public.get_user_org_id());

CREATE POLICY "Users can update their own conversations"
  ON conversations FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own conversations"
  ON conversations FOR DELETE
  USING (user_id = auth.uid());

-- Assessment Types RLS
CREATE POLICY "Users can view assessment types in their organization"
  ON assessment_types FOR SELECT
  USING (org_id = public.get_user_org_id());

CREATE POLICY "Org admins can insert assessment types in their organization"
  ON assessment_types FOR INSERT
  WITH CHECK (org_id = public.get_user_org_id() AND public.is_user_admin());

CREATE POLICY "Org admins can update assessment types in their organization"
  ON assessment_types FOR UPDATE
  USING (org_id = public.get_user_org_id() AND public.is_user_admin());

CREATE POLICY "Org admins can delete assessment types in their organization"
  ON assessment_types FOR DELETE
  USING (org_id = public.get_user_org_id() AND public.is_user_admin());

-- Assessments RLS
CREATE POLICY "Users can view assessments in their organization"
  ON assessments FOR SELECT
  USING (
    org_id = public.get_user_org_id()
    OR employee_id = auth.uid()
  );

CREATE POLICY "Org admins can insert assessments in their organization"
  ON assessments FOR INSERT
  WITH CHECK (org_id = public.get_user_org_id() AND public.is_user_admin());

CREATE POLICY "Org admins can update assessments in their organization"
  ON assessments FOR UPDATE
  USING (org_id = public.get_user_org_id() AND public.is_user_admin());

CREATE POLICY "Employees can update their own assessments"
  ON assessments FOR UPDATE
  USING (employee_id = auth.uid());

CREATE POLICY "Org admins can delete assessments in their organization"
  ON assessments FOR DELETE
  USING (org_id = public.get_user_org_id() AND public.is_user_admin());

-- Question Banks RLS
CREATE POLICY "Users can view question banks in their organization"
  ON question_banks FOR SELECT
  USING (org_id = public.get_user_org_id());

CREATE POLICY "Org admins can insert question banks in their organization"
  ON question_banks FOR INSERT
  WITH CHECK (org_id = public.get_user_org_id() AND public.is_user_admin());

CREATE POLICY "Org admins can update question banks in their organization"
  ON question_banks FOR UPDATE
  USING (org_id = public.get_user_org_id() AND public.is_user_admin());

CREATE POLICY "Org admins can delete question banks in their organization"
  ON question_banks FOR DELETE
  USING (org_id = public.get_user_org_id() AND public.is_user_admin());

-- Question Library RLS
CREATE POLICY "Users can view question library in their organization"
  ON question_library FOR SELECT
  USING (org_id = public.get_user_org_id());

CREATE POLICY "Org admins can insert question library in their organization"
  ON question_library FOR INSERT
  WITH CHECK (org_id = public.get_user_org_id() AND public.is_user_admin());

CREATE POLICY "Org admins can update question library in their organization"
  ON question_library FOR UPDATE
  USING (org_id = public.get_user_org_id() AND public.is_user_admin());

CREATE POLICY "Org admins can delete question library in their organization"
  ON question_library FOR DELETE
  USING (org_id = public.get_user_org_id() AND public.is_user_admin());

-- ============================================
-- GRANT EXECUTE PERMISSIONS
-- ============================================

-- Grant execute on the helper functions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_org_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_platform() TO authenticated;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON FUNCTION public.get_user_org_id() IS 'Returns the org_id of the current authenticated user. Uses SECURITY DEFINER to bypass RLS and prevent infinite recursion.';
COMMENT ON FUNCTION public.is_user_admin() IS 'Returns true if the current authenticated user has admin role. Uses SECURITY DEFINER to bypass RLS.';
COMMENT ON FUNCTION public.get_user_role() IS 'Returns the role of the current authenticated user. Uses SECURITY DEFINER to bypass RLS.';
COMMENT ON FUNCTION public.can_manage_platform() IS 'Returns true if user is authenticated. Platform owner validation is done at API level.';
