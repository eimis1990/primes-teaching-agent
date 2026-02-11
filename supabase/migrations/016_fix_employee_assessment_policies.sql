-- ============================================
-- FIX EMPLOYEE ASSESSMENT POLICIES
-- Migration: 016_fix_employee_assessment_policies.sql
-- Description: Update RLS policies to work with users table instead of employees table
-- ============================================

-- ============================================
-- 1. DROP OLD POLICIES THAT REFERENCE EMPLOYEES TABLE
-- ============================================

-- These policies were created in migration 010 but reference the employees table
-- which was removed in migration 014. Need to recreate them with users table.

DROP POLICY IF EXISTS "Employees can view their own assessments" ON assessments;
DROP POLICY IF EXISTS "Employees can update their own assessments" ON assessments;
DROP POLICY IF EXISTS "Employees can view questions in their assessments" ON assessment_questions;
DROP POLICY IF EXISTS "Employees can view topics in their assessments" ON assessment_topics;
DROP POLICY IF EXISTS "Employees can insert answers to their assessments" ON assessment_answers;
DROP POLICY IF EXISTS "Employees can view their own answers" ON assessment_answers;
DROP POLICY IF EXISTS "Employees can update their own answers" ON assessment_answers;

-- ============================================
-- 2. CREATE NEW POLICIES USING USERS TABLE
-- ============================================

-- Assessments: Employees can view assessments assigned to them
CREATE POLICY "Employees can view their assigned assessments"
  ON assessments FOR SELECT
  USING (employee_id = auth.uid());

-- Assessments: Employees can update their assigned assessments (status changes)
CREATE POLICY "Employees can update their assigned assessments"
  ON assessments FOR UPDATE
  USING (employee_id = auth.uid());

-- Assessment Questions: Employees can view questions in their assigned assessments
CREATE POLICY "Employees can view questions in their assigned assessments"
  ON assessment_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM assessments
      WHERE assessments.id = assessment_questions.assessment_id
      AND assessments.employee_id = auth.uid()
    )
  );

-- Assessment Topics: Employees can view topics in their assigned assessments
CREATE POLICY "Employees can view topics in their assigned assessments"
  ON assessment_topics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM assessments
      WHERE assessments.id = assessment_topics.assessment_id
      AND assessments.employee_id = auth.uid()
    )
  );

-- Assessment Answers: Employees can insert answers to their assigned assessments
CREATE POLICY "Employees can insert answers to their assigned assessments"
  ON assessment_answers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assessments
      WHERE assessments.id = assessment_answers.assessment_id
      AND assessments.employee_id = auth.uid()
      AND assessment_answers.employee_id = auth.uid()
    )
  );

-- Assessment Answers: Employees can view their own answers
CREATE POLICY "Employees can view their own answers"
  ON assessment_answers FOR SELECT
  USING (employee_id = auth.uid());

-- Assessment Answers: Employees can update their own answers
CREATE POLICY "Employees can update their own answers"
  ON assessment_answers FOR UPDATE
  USING (employee_id = auth.uid());
