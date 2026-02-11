-- ============================================
-- MIGRATION: OAuth-based Employee Authentication
-- ============================================
-- This migration updates the employees table to support
-- Google OAuth authentication instead of password-based login.
-- ============================================

-- Make password_hash nullable (OAuth users won't have passwords)
ALTER TABLE employees ALTER COLUMN password_hash DROP NOT NULL;

-- Add RLS policy for employees to read their own record via OAuth
-- This allows employees who authenticated via Google OAuth to read their own record
CREATE POLICY "Employees can view own record via OAuth"
  ON employees FOR SELECT
  USING (email = (auth.jwt()->>'email')::text);
