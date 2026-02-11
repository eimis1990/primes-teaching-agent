-- ============================================
-- ASSESSMENTS SYSTEM
-- Migration: 006_assessments_system.sql
-- Description: Complete assessment feature with employees, types, questions, and answers
-- ============================================

-- ============================================
-- 1. EMPLOYEES TABLE
-- Separate from users (admins) - employees are assessment recipients
-- ============================================
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  position TEXT,
  avatar_url TEXT,
  password_hash TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(email, created_by)
);

-- ============================================
-- 2. ASSESSMENT TYPES TABLE
-- Admin-configurable assessment types
-- ============================================
CREATE TABLE assessment_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(name, user_id)
);

-- ============================================
-- 3. ENUM TYPES
-- ============================================
CREATE TYPE assessment_status AS ENUM ('draft', 'sent', 'in_progress', 'completed', 'expired');
CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE question_type AS ENUM ('multiple_choice', 'true_false', 'open_ended', 'scenario');

-- ============================================
-- 4. ASSESSMENTS TABLE
-- Main assessment records
-- ============================================
CREATE TABLE assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  assessment_type_id UUID REFERENCES assessment_types(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  status assessment_status DEFAULT 'draft',
  difficulty difficulty_level DEFAULT 'medium',
  passing_score INTEGER DEFAULT 70 CHECK (passing_score >= 0 AND passing_score <= 100),
  questions_per_topic INTEGER DEFAULT 5 CHECK (questions_per_topic >= 1 AND questions_per_topic <= 20),
  due_date TIMESTAMPTZ,
  score DECIMAL(5,2),
  total_points INTEGER,
  earned_points INTEGER,
  ai_feedback JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 5. ASSESSMENT TOPICS TABLE (Many-to-Many)
-- Links assessments to selected topics/folders from Knowledge Base
-- ============================================
CREATE TABLE assessment_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE NOT NULL,
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE NOT NULL,
  questions_count INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(assessment_id, topic_id)
);

-- ============================================
-- 6. ASSESSMENT QUESTIONS TABLE
-- AI-generated questions stored when assessment is created
-- ============================================
CREATE TABLE assessment_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE NOT NULL,
  topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
  question_text TEXT NOT NULL,
  question_type question_type DEFAULT 'open_ended',
  options JSONB DEFAULT '[]',
  correct_answer TEXT,
  expected_keywords JSONB DEFAULT '[]',
  explanation TEXT,
  difficulty difficulty_level DEFAULT 'medium',
  points INTEGER DEFAULT 10,
  order_index INTEGER DEFAULT 0,
  source_chunk_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 7. ASSESSMENT ANSWERS TABLE
-- Employee responses to assessment questions
-- ============================================
CREATE TABLE assessment_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES assessment_questions(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  answer_text TEXT NOT NULL,
  selected_option_id TEXT,
  is_correct BOOLEAN,
  points_earned INTEGER DEFAULT 0,
  ai_feedback TEXT,
  keywords_found JSONB DEFAULT '[]',
  keywords_missing JSONB DEFAULT '[]',
  confidence_score DECIMAL(3,2),
  answered_at TIMESTAMPTZ DEFAULT now(),
  graded_at TIMESTAMPTZ
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_employees_created_by ON employees(created_by);
CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_assessment_types_user ON assessment_types(user_id);
CREATE INDEX idx_assessments_user ON assessments(user_id);
CREATE INDEX idx_assessments_employee ON assessments(employee_id);
CREATE INDEX idx_assessments_status ON assessments(status);
CREATE INDEX idx_assessment_topics_assessment ON assessment_topics(assessment_id);
CREATE INDEX idx_assessment_topics_topic ON assessment_topics(topic_id);
CREATE INDEX idx_assessment_questions_assessment ON assessment_questions(assessment_id);
CREATE INDEX idx_assessment_questions_topic ON assessment_questions(topic_id);
CREATE INDEX idx_assessment_answers_assessment ON assessment_answers(assessment_id);
CREATE INDEX idx_assessment_answers_question ON assessment_answers(question_id);
CREATE INDEX idx_assessment_answers_employee ON assessment_answers(employee_id);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Employees RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view their employees"
  ON employees FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Admins can insert their employees"
  ON employees FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can update their employees"
  ON employees FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Admins can delete their employees"
  ON employees FOR DELETE
  USING (auth.uid() = created_by);

-- Assessment Types RLS
ALTER TABLE assessment_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view their assessment types"
  ON assessment_types FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can insert their assessment types"
  ON assessment_types FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update their assessment types"
  ON assessment_types FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete their assessment types"
  ON assessment_types FOR DELETE
  USING (auth.uid() = user_id);

-- Assessments RLS
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view their assessments"
  ON assessments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can insert their assessments"
  ON assessments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update their assessments"
  ON assessments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete their assessments"
  ON assessments FOR DELETE
  USING (auth.uid() = user_id);

-- Assessment Topics RLS
ALTER TABLE assessment_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view assessment topics"
  ON assessment_topics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM assessments
      WHERE assessments.id = assessment_topics.assessment_id
      AND assessments.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert assessment topics"
  ON assessment_topics FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assessments
      WHERE assessments.id = assessment_topics.assessment_id
      AND assessments.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update assessment topics"
  ON assessment_topics FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM assessments
      WHERE assessments.id = assessment_topics.assessment_id
      AND assessments.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete assessment topics"
  ON assessment_topics FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM assessments
      WHERE assessments.id = assessment_topics.assessment_id
      AND assessments.user_id = auth.uid()
    )
  );

-- Assessment Questions RLS
ALTER TABLE assessment_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view assessment questions"
  ON assessment_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM assessments
      WHERE assessments.id = assessment_questions.assessment_id
      AND assessments.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert assessment questions"
  ON assessment_questions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assessments
      WHERE assessments.id = assessment_questions.assessment_id
      AND assessments.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update assessment questions"
  ON assessment_questions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM assessments
      WHERE assessments.id = assessment_questions.assessment_id
      AND assessments.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete assessment questions"
  ON assessment_questions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM assessments
      WHERE assessments.id = assessment_questions.assessment_id
      AND assessments.user_id = auth.uid()
    )
  );

-- Assessment Answers RLS
ALTER TABLE assessment_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view answers for their assessments"
  ON assessment_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM assessments
      WHERE assessments.id = assessment_answers.assessment_id
      AND assessments.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert answers for their assessments"
  ON assessment_answers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM assessments
      WHERE assessments.id = assessment_answers.assessment_id
      AND assessments.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update answers for their assessments"
  ON assessment_answers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM assessments
      WHERE assessments.id = assessment_answers.assessment_id
      AND assessments.user_id = auth.uid()
    )
  );

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessment_types_updated_at
  BEFORE UPDATE ON assessment_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assessments_updated_at
  BEFORE UPDATE ON assessments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to check and expire overdue assessments
CREATE OR REPLACE FUNCTION expire_overdue_assessments()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE assessments
  SET status = 'expired', updated_at = now()
  WHERE status IN ('sent', 'in_progress')
    AND due_date < now()
    AND due_date IS NOT NULL;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
