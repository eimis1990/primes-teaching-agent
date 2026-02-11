import { createClient } from '@/lib/supabase/server'

export interface WeakArea {
  topic: string
  score: number
  questionCount: number
  recommendation: string
}

export interface ExamAnalytics {
  totalExams: number
  averageScore: number
  weakAreas: WeakArea[]
  improvementTrend: number // positive = improving, negative = declining
  lastExamDate: string | null
}

/**
 * Analyze user's exam performance and identify weak areas
 */
export async function analyzeUserPerformance(
  userId: string,
  topicId?: string
): Promise<ExamAnalytics> {
  try {
    const supabase = await createClient()
    
    // Get all exam sessions
    let query = supabase
      .from('exam_sessions')
      .select(`
        id,
        score,
        total_points,
        completed_at,
        question_bank:question_banks!inner(
          id,
          topic:topics!inner(
            id,
            title
          )
        ),
        answers:exam_answers(
          is_correct,
          points_earned,
          question:questions!inner(
            difficulty,
            question_type
          )
        )
      `)
      .eq('user_id', userId)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
    
    if (topicId) {
      // This doesn't work directly, need to filter after
    }
    
    const { data: sessions, error } = await query
    
    if (error) throw error
    
    if (!sessions || sessions.length === 0) {
      return {
        totalExams: 0,
        averageScore: 0,
        weakAreas: [],
        improvementTrend: 0,
        lastExamDate: null
      }
    }
    
    // Calculate average score
    const totalExams = sessions.length
    const averageScore = sessions.reduce((sum, s) => sum + (s.score || 0), 0) / totalExams
    
    // Calculate improvement trend (compare recent vs older exams)
    const recentExams = sessions.slice(0, Math.ceil(totalExams / 3))
    const olderExams = sessions.slice(-Math.ceil(totalExams / 3))
    
    const recentAvg = recentExams.reduce((sum, s) => sum + (s.score || 0), 0) / recentExams.length
    const olderAvg = olderExams.reduce((sum, s) => sum + (s.score || 0), 0) / olderExams.length
    const improvementTrend = recentAvg - olderAvg
    
    // Identify weak areas by analyzing wrong answers
    const weakAreas: WeakArea[] = []
    const topicPerformance = new Map<string, { correct: number, total: number, topicName: string }>()
    
    for (const session of sessions) {
      const topicId = session.question_bank?.topic?.id
      const topicName = session.question_bank?.topic?.title || 'Unknown'
      
      if (!topicId) continue
      
      if (!topicPerformance.has(topicId)) {
        topicPerformance.set(topicId, { correct: 0, total: 0, topicName })
      }
      
      const perf = topicPerformance.get(topicId)!
      
      for (const answer of session.answers || []) {
        perf.total++
        if (answer.is_correct) {
          perf.correct++
        }
      }
    }
    
    // Convert to weak areas (topics with < 70% correct)
    for (const [topicId, perf] of topicPerformance) {
      const score = perf.total > 0 ? (perf.correct / perf.total) * 100 : 0
      
      if (score < 70) {
        weakAreas.push({
          topic: perf.topicName,
          score,
          questionCount: perf.total,
          recommendation: score < 50 
            ? `Critical: Review all materials in ${perf.topicName}` 
            : `Review key concepts in ${perf.topicName}`
        })
      }
    }
    
    // Sort weak areas by score (worst first)
    weakAreas.sort((a, b) => a.score - b.score)
    
    return {
      totalExams,
      averageScore,
      weakAreas,
      improvementTrend,
      lastExamDate: sessions[0]?.completed_at || null
    }
  } catch (error) {
    console.error('Error analyzing performance:', error)
    return {
      totalExams: 0,
      averageScore: 0,
      weakAreas: [],
      improvementTrend: 0,
      lastExamDate: null
    }
  }
}

/**
 * Get detailed recommendations for a specific exam
 */
export async function getExamRecommendations(
  examSessionId: string
): Promise<{
  weakTopics: string[]
  documentsToReview: Array<{ id: string, title: string }>
  practiceQuestions: string[]
}> {
  try {
    const supabase = await createClient()
    
    // Get exam details with answers
    const { data: session, error } = await supabase
      .from('exam_sessions')
      .select(`
        id,
        question_bank:question_banks!inner(
          topic_id,
          topic:topics!inner(
            id,
            title
          )
        ),
        answers:exam_answers(
          is_correct,
          ai_feedback,
          question:questions!inner(
            question_text,
            expected_keywords
          )
        )
      `)
      .eq('id', examSessionId)
      .single()
    
    if (error || !session) {
      throw new Error('Exam session not found')
    }
    
    // Identify weak topics from wrong answers
    const wrongKeywords = new Set<string>()
    const wrongQuestions = []
    
    for (const answer of session.answers || []) {
      if (!answer.is_correct) {
        wrongQuestions.push(answer.question.question_text)
        for (const keyword of answer.question.expected_keywords || []) {
          wrongKeywords.add(keyword)
        }
      }
    }
    
    // Get relevant documents to review (search by weak keywords)
    const { data: docs } = await supabase
      .from('documents')
      .select('id, title')
      .eq('topic_id', session.question_bank.topic_id)
      .limit(5)
    
    return {
      weakTopics: Array.from(wrongKeywords),
      documentsToReview: docs || [],
      practiceQuestions: wrongQuestions.slice(0, 5)
    }
  } catch (error) {
    console.error('Error getting recommendations:', error)
    return {
      weakTopics: [],
      documentsToReview: [],
      practiceQuestions: []
    }
  }
}
