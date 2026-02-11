-- ============================================
-- MIGRATION: Employee Self-Registration via OAuth
-- ============================================
-- This migration updates the employees table to support
-- self-registration when users sign in via Google OAuth
-- with the "employee" role selected.
-- ============================================

-- Make created_by nullable (self-registered OAuth employees won't have an admin creator)
ALTER TABLE employees ALTER COLUMN created_by DROP NOT NULL;

-- Add unique constraint on email alone for OAuth employees (who don't have created_by)
-- This prevents duplicate self-registrations
CREATE UNIQUE INDEX idx_employees_email_self_registered
  ON employees (email)
  WHERE created_by IS NULL;

-- Add RLS policy for employees to insert their own record via OAuth
CREATE POLICY "Employees can self-register via OAuth"
  ON employees FOR INSERT
  WITH CHECK (
    email = (auth.jwt()->>'email')::text
    AND created_by IS NULL
  );

-- Add RLS policy for employees to update their own record via OAuth
CREATE POLICY "Employees can update own record via OAuth"
  ON employees FOR UPDATE
  USING (email = (auth.jwt()->>'email')::text);
