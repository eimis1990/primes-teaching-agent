-- ============================================
-- MIGRATION: Allow Employees to View Their Assessments
-- ============================================
-- This migration adds RLS policies to allow employees
-- to view and update assessments assigned to them.
-- ============================================

-- Add policy for employees to view their own assessments
-- The employee's email from OAuth (auth.jwt()->>'email') must match
-- the email in the employees table for the assessment's employee_id
CREATE POLICY "Employees can view their own assessments"
  ON assessments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = assessments.employee_id
      AND employees.email = (auth.jwt()->>'email')::text
    )
  );

-- Add policy for employees to update their own assessments (for status changes)
-- Employees can only update their own assessments (start, complete, etc.)
CREATE POLICY "Employees can update their own assessments"
  ON assessments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = assessments.employee_id
      AND employees.email = (auth.jwt()->>'email')::text
    )
  );

-- Add policy for employees to view questions in their assessments
CREATE POLICY "Employees can view questions in their assessments"
  ON assessment_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM assessments
      JOIN employees ON employees.id = assessments.employee_id
      WHERE assessments.id = assessment_questions.assessment_id
      AND employees.email = (auth.jwt()->>'email')::text
    )
  );

-- Add policy for employees to view assessment topics in their assessments
CREATE POLICY "Employees can view topics in their assessments"
  ON assessment_topics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM assessments
      JOIN employees ON employees.id = assessments.employee_id
      WHERE assessments.id = assessment_topics.assessment_id
      AND employees.email = (auth.jwt()->>'email')::text
    )
  );

-- Add policy for employees to insert answers to their assessments
CREATE POLICY "Employees can insert answers to their assessments"
  ON assessment_answers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assessments
      JOIN employees ON employees.id = assessments.employee_id
      WHERE assessments.id = assessment_answers.assessment_id
      AND employees.email = (auth.jwt()->>'email')::text
      AND assessment_answers.employee_id = employees.id
    )
  );

-- Add policy for employees to view their own answers
CREATE POLICY "Employees can view their own answers"
  ON assessment_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = assessment_answers.employee_id
      AND employees.email = (auth.jwt()->>'email')::text
    )
  );

-- Add policy for employees to update their own answers (if needed for corrections)
CREATE POLICY "Employees can update their own answers"
  ON assessment_answers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = assessment_answers.employee_id
      AND employees.email = (auth.jwt()->>'email')::text
    )
  );
