-- Create question_banks table
CREATE TABLE question_banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create questions table
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_bank_id UUID REFERENCES question_banks(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT CHECK (question_type IN ('open_ended', 'scenario', 'true_false', 'multiple_choice')),
  expected_keywords JSONB DEFAULT '[]', -- For validation
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  points INTEGER DEFAULT 1,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create exam_sessions table
CREATE TABLE exam_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  question_bank_id UUID REFERENCES question_banks(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  score DECIMAL(5,2),
  total_points INTEGER,
  feedback JSONB DEFAULT '{}' -- Weak areas, recommendations
);

-- Create exam_answers table
CREATE TABLE exam_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_session_id UUID REFERENCES exam_sessions(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  user_answer TEXT NOT NULL,
  is_correct BOOLEAN,
  ai_feedback TEXT,
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies for question_banks
ALTER TABLE question_banks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own question banks"
  ON question_banks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own question banks"
  ON question_banks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own question banks"
  ON question_banks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own question banks"
  ON question_banks FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for questions
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view questions in own banks"
  ON questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM question_banks
      WHERE question_banks.id = questions.question_bank_id
      AND question_banks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert questions in own banks"
  ON questions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM question_banks
      WHERE question_banks.id = questions.question_bank_id
      AND question_banks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update questions in own banks"
  ON questions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM question_banks
      WHERE question_banks.id = questions.question_bank_id
      AND question_banks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete questions in own banks"
  ON questions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM question_banks
      WHERE question_banks.id = questions.question_bank_id
      AND question_banks.user_id = auth.uid()
    )
  );

-- RLS Policies for exam_sessions
ALTER TABLE exam_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own exam sessions"
  ON exam_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own exam sessions"
  ON exam_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own exam sessions"
  ON exam_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for exam_answers
ALTER TABLE exam_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view answers in own sessions"
  ON exam_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM exam_sessions
      WHERE exam_sessions.id = exam_answers.exam_session_id
      AND exam_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert answers in own sessions"
  ON exam_answers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM exam_sessions
      WHERE exam_sessions.id = exam_answers.exam_session_id
      AND exam_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update answers in own sessions"
  ON exam_answers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM exam_sessions
      WHERE exam_sessions.id = exam_answers.exam_session_id
      AND exam_sessions.user_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX ON question_banks (user_id);
CREATE INDEX ON question_banks (topic_id);
CREATE INDEX ON questions (question_bank_id);
CREATE INDEX ON exam_sessions (user_id);
CREATE INDEX ON exam_sessions (question_bank_id);
CREATE INDEX ON exam_answers (exam_session_id);
CREATE INDEX ON exam_answers (question_id);
