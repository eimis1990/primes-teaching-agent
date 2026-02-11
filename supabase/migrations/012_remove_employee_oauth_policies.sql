-- ============================================
-- MIGRATION: Remove Employee OAuth Policies
-- ============================================
-- Since employees now use password-only authentication
-- (no OAuth), we remove ALL OAuth-related RLS policies.
-- Employee API routes will use service client to bypass RLS.
-- ============================================

-- Drop ALL employee OAuth-related policies
DROP POLICY IF EXISTS "Employees can view own record via OAuth" ON employees;
DROP POLICY IF EXISTS "Employees can self-register via OAuth" ON employees;
DROP POLICY IF EXISTS "Employees can update own record via OAuth" ON employees;

-- Drop policies from migration 010 that check auth.jwt() for employees
-- These won't work since employees aren't in Supabase auth anymore
DROP POLICY IF EXISTS "Employees can view their own assessments" ON assessments;
DROP POLICY IF EXISTS "Employees can update their own assessments" ON assessments;
DROP POLICY IF EXISTS "Employees can view questions in their assessments" ON assessment_questions;
DROP POLICY IF EXISTS "Employees can view topics in their assessments" ON assessment_topics;
DROP POLICY IF EXISTS "Employees can insert answers to their assessments" ON assessment_answers;
DROP POLICY IF EXISTS "Employees can view their own answers" ON assessment_answers;
DROP POLICY IF EXISTS "Employees can update their own answers" ON assessment_answers;
DROP POLICY IF EXISTS "Employees can view assessment types on their assessments" ON assessment_types;

-- NOTE: Employee API routes should use createServiceClient() to bypass RLS
-- since employees are not in Supabase auth (auth.uid() will be null for them)
