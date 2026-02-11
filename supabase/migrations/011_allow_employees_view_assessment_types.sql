-- ============================================
-- MIGRATION: Allow Employees to View Assessment Types
-- ============================================
-- This allows employees to see the assessment type
-- information on their assigned assessments.
-- ============================================

-- Add policy for employees to view assessment types on their assessments
CREATE POLICY "Employees can view assessment types on their assessments"
  ON assessment_types FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM assessments
      JOIN employees ON employees.id = assessments.employee_id
      WHERE assessments.assessment_type_id = assessment_types.id
      AND employees.email = (auth.jwt()->>'email')::text
    )
  );
