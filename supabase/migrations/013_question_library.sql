-- ============================================
-- QUESTION LIBRARY SYSTEM
-- Migration: 013_question_library.sql
-- Description: Reusable question library for assessments
-- ============================================

-- ============================================
-- QUESTION LIBRARY TABLE
-- Store approved questions that can be reused across multiple assessments
-- ============================================
CREATE TABLE question_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  question_type question_type DEFAULT 'open_ended',
  options JSONB DEFAULT '[]',
  correct_answer TEXT,
  expected_keywords JSONB DEFAULT '[]',
  explanation TEXT,
  difficulty difficulty_level DEFAULT 'medium',
  points INTEGER DEFAULT 10,
  source_chunk_text TEXT,
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_question_library_user ON question_library(user_id);
CREATE INDEX idx_question_library_topic ON question_library(topic_id);
CREATE INDEX idx_question_library_difficulty ON question_library(difficulty);
CREATE INDEX idx_question_library_active ON question_library(is_active);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE question_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their question library"
  ON question_library FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their question library"
  ON question_library FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their question library"
  ON question_library FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their question library"
  ON question_library FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- TRIGGER FOR UPDATED_AT
-- ============================================
CREATE TRIGGER update_question_library_updated_at
  BEFORE UPDATE ON question_library
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCTION TO INCREMENT USAGE COUNT
-- ============================================
CREATE OR REPLACE FUNCTION increment_question_usage(question_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE question_library
  SET usage_count = usage_count + 1
  WHERE id = question_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
