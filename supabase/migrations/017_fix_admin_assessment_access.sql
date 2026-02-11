-- ============================================
-- FIX ADMIN ASSESSMENT ACCESS
-- Migration: 017_fix_admin_assessment_access.sql
-- Description: Ensure admins can properly create and view assessments with all related data
-- ============================================

-- ============================================
-- 1. ENSURE ASSESSMENT_TOPICS HAS PROPER POLICIES FOR ADMINS
-- ============================================

-- Drop any existing policies that might conflict
DROP POLICY IF EXISTS "Admins can view assessment topics" ON assessment_topics;
DROP POLICY IF EXISTS "Admins can insert assessment topics" ON assessment_topics;
DROP POLICY IF EXISTS "Admins can update assessment topics" ON assessment_topics;
DROP POLICY IF EXISTS "Admins can delete assessment topics" ON assessment_topics;

-- Create comprehensive policies for admin access
CREATE POLICY "Admins can view assessment topics for their assessments"
  ON assessment_topics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM assessments
      WHERE assessments.id = assessment_topics.assessment_id
      AND (
        assessments.user_id = auth.uid()
        OR assessments.employee_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can insert assessment topics for their assessments"
  ON assessment_topics FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assessments
      WHERE assessments.id = assessment_topics.assessment_id
      AND assessments.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update assessment topics for their assessments"
  ON assessment_topics FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM assessments
      WHERE assessments.id = assessment_topics.assessment_id
      AND assessments.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete assessment topics for their assessments"
  ON assessment_topics FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM assessments
      WHERE assessments.id = assessment_topics.assessment_id
      AND assessments.user_id = auth.uid()
    )
  );

-- ============================================
-- 2. ENSURE ASSESSMENT_QUESTIONS HAS PROPER POLICIES FOR ADMINS
-- ============================================

-- Drop any existing policies that might conflict
DROP POLICY IF EXISTS "Admins can view assessment questions" ON assessment_questions;
DROP POLICY IF EXISTS "Admins can insert assessment questions" ON assessment_questions;
DROP POLICY IF EXISTS "Admins can update assessment questions" ON assessment_questions;
DROP POLICY IF EXISTS "Admins can delete assessment questions" ON assessment_questions;

-- Create comprehensive policies for admin access
CREATE POLICY "Admins can view assessment questions for their assessments"
  ON assessment_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM assessments
      WHERE assessments.id = assessment_questions.assessment_id
      AND (
        assessments.user_id = auth.uid()
        OR assessments.employee_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can insert assessment questions for their assessments"
  ON assessment_questions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assessments
      WHERE assessments.id = assessment_questions.assessment_id
      AND assessments.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update assessment questions for their assessments"
  ON assessment_questions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM assessments
      WHERE assessments.id = assessment_questions.assessment_id
      AND assessments.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete assessment questions for their assessments"
  ON assessment_questions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM assessments
      WHERE assessments.id = assessment_questions.assessment_id
      AND assessments.user_id = auth.uid()
    )
  );

-- ============================================
-- 3. VERIFY TOPICS TABLE HAS RLS ENABLED AND PROPER POLICIES
-- ============================================

-- Enable RLS if not already enabled
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;

-- Ensure there's a policy for users to view topics (should exist from migration 015)
-- This is just a check, the policy should already exist:
-- "Users can view topics in their organization"

-- ============================================
-- 4. ADD HELPFUL COMMENTS
-- ============================================

COMMENT ON POLICY "Admins can view assessment topics for their assessments" ON assessment_topics 
  IS 'Allows admins to view topics for assessments they created, and employees to view topics for assessments assigned to them';

COMMENT ON POLICY "Admins can view assessment questions for their assessments" ON assessment_questions 
  IS 'Allows admins to view questions for assessments they created, and employees to view questions for assessments assigned to them';
