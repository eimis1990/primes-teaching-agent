// ============================================
// ASSESSMENT TYPES
// TypeScript interfaces and types for the assessments feature
// ============================================

// ============================================
// ENUMS
// ============================================

export type AssessmentStatus = 'draft' | 'sent' | 'in_progress' | 'completed' | 'expired';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type QuestionType = 'multiple_choice' | 'true_false' | 'open_ended' | 'scenario';

// ============================================
// EMPLOYEE TYPES
// ============================================

export interface Employee {
  id: string;
  created_by: string;
  email: string;
  full_name: string;
  position?: string;
  avatar_url?: string;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateEmployeeInput {
  email: string;
  full_name: string;
  position?: string;
  password: string;
}

export interface UpdateEmployeeInput {
  email?: string;
  full_name?: string;
  position?: string;
  is_active?: boolean;
}

// ============================================
// ASSESSMENT TYPE TYPES
// ============================================

export interface AssessmentType {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAssessmentTypeInput {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateAssessmentTypeInput {
  name?: string;
  description?: string;
  color?: string;
  is_active?: boolean;
}

// ============================================
// ASSESSMENT TYPES
// ============================================

export interface Assessment {
  id: string;
  user_id: string;
  employee_id: string;
  assessment_type_id?: string;
  title: string;
  status: AssessmentStatus;
  difficulty: DifficultyLevel;
  passing_score: number;
  questions_per_topic: number;
  due_date?: string;
  score?: number;
  total_points?: number;
  earned_points?: number;
  ai_feedback?: Record<string, unknown>;
  sent_at?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  // Joined relations
  employee?: Employee;
  assessment_type?: AssessmentType;
  topics?: AssessmentTopic[];
  questions?: AssessmentQuestion[];
}

export interface AssessmentTopic {
  id: string;
  assessment_id: string;
  topic_id: string;
  questions_count: number;
  created_at: string;
  // Joined
  topic?: {
    id: string;
    title: string;
    description?: string;
  };
}

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface AssessmentQuestion {
  id: string;
  assessment_id: string;
  topic_id?: string;
  question_text: string;
  question_type: QuestionType;
  options: QuestionOption[];
  correct_answer?: string;
  expected_keywords: string[];
  explanation?: string;
  difficulty: DifficultyLevel;
  points: number;
  order_index: number;
  source_chunk_text?: string;
  created_at: string;
}

export interface AssessmentAnswer {
  id: string;
  assessment_id: string;
  question_id: string;
  employee_id: string;
  answer_text: string;
  selected_option_id?: string;
  is_correct?: boolean;
  points_earned: number;
  ai_feedback?: string;
  keywords_found: string[];
  keywords_missing: string[];
  confidence_score?: number;
  answered_at: string;
  graded_at?: string;
}

// ============================================
// WIZARD/FORM TYPES
// ============================================

export interface WizardStep1Data {
  title: string;
  assessment_type_id: string;
  topic_ids: string[];
}

export interface WizardStep2Data {
  employee_id: string;
  new_employee?: CreateEmployeeInput;
}

export interface WizardStep3Data {
  due_date?: string;
  difficulty: DifficultyLevel;
  passing_score: number;
  questions_per_topic: number;
}

export interface CreateAssessmentInput {
  title: string;
  assessment_type_id?: string;
  employee_id: string;
  topic_ids: string[];
  questions_per_topic: number;
  due_date?: string;
  difficulty: DifficultyLevel;
  passing_score: number;
}

export interface UpdateAssessmentInput {
  title?: string;
  assessment_type_id?: string;
  due_date?: string;
  difficulty?: DifficultyLevel;
  passing_score?: number;
  status?: AssessmentStatus;
}

// ============================================
// QUESTION LIBRARY TYPES
// ============================================

export interface QuestionLibrary {
  id: string;
  user_id: string;
  topic_id: string;
  question_text: string;
  question_type: QuestionType;
  options: QuestionOption[];
  correct_answer?: string;
  expected_keywords: string[];
  explanation?: string;
  difficulty: DifficultyLevel;
  points: number;
  source_chunk_text?: string;
  usage_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  topic?: {
    id: string;
    title: string;
  };
}

export interface CreateQuestionLibraryInput {
  topic_id: string;
  question_text: string;
  question_type: QuestionType;
  options?: QuestionOption[];
  correct_answer?: string;
  expected_keywords: string[];
  explanation?: string;
  difficulty: DifficultyLevel;
  points: number;
  source_chunk_text?: string;
}

// ============================================
// AI GENERATION TYPES
// ============================================

export interface GenerateQuestionsInput {
  assessment_id: string;
  topic_ids: string[];
  difficulty: DifficultyLevel;
  questions_per_topic: number;
}

export interface GeneratedQuestion {
  question_text: string;
  question_type: QuestionType;
  options?: QuestionOption[];
  correct_answer?: string;
  expected_keywords: string[];
  explanation: string;
  difficulty: DifficultyLevel;
  points: number;
  source_chunk_text: string;
  topic_id: string;
}

export interface GradeAnswerInput {
  question_id: string;
  question_text: string;
  question_type: QuestionType;
  expected_keywords: string[];
  correct_answer?: string;
  user_answer: string;
  options?: QuestionOption[];
}

export interface GradingResult {
  is_correct: boolean;
  score: number; // 0.0 to 1.0
  points_earned: number;
  ai_feedback: string;
  keywords_found: string[];
  keywords_missing: string[];
  confidence_score: number;
}

// ============================================
// EMPLOYEE PORTAL TYPES
// ============================================

export interface EmployeeLoginInput {
  email: string;
  password: string;
}

export interface EmployeeSession {
  employee_id: string;
  email: string;
  full_name: string;
  position?: string;
  avatar_url?: string;
  admin_id: string;
}

export interface EmployeeDashboardStats {
  pending_assessments: number;
  in_progress_assessments: number;
  completed_assessments: number;
  average_score: number;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface AssessmentListResponse {
  assessments: Assessment[];
  total: number;
  page: number;
  per_page: number;
}

export interface AssessmentDetailResponse {
  assessment: Assessment;
  questions: AssessmentQuestion[];
  answers?: AssessmentAnswer[];
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}
