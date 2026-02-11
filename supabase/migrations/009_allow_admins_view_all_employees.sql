-- ============================================
-- MIGRATION: Allow Admins to View All Employees
-- ============================================
-- This migration updates the RLS policy to allow admins
-- to view both employees they created AND self-registered
-- OAuth employees (where created_by IS NULL).
-- ============================================

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Admins can view their employees" ON employees;

-- Create new policy that allows admins to see:
-- 1. Employees they created (created_by = their user_id)
-- 2. Self-registered OAuth employees (created_by IS NULL)
CREATE POLICY "Admins can view their and self-registered employees"
  ON employees FOR SELECT
  USING (
    auth.uid() = created_by 
    OR created_by IS NULL
  );
