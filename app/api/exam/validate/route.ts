import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateAnswer } from '@/lib/exam/validator'

export const runtime = 'nodejs'

/**
 * POST /api/exam/validate
 * Validate a single answer
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const { 
      examSessionId,
      questionId, 
      userAnswer 
    } = await request.json()
    
    if (!examSessionId || !questionId || !userAnswer) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Get question details
    const { data: question, error: questionError } = await supabase
      .from('questions')
      .select('question_text, question_type, expected_keywords, points')
      .eq('id', questionId)
      .single()
    
    if (questionError || !question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      )
    }
    
    // Validate the answer
    const validation = await validateAnswer(
      question.question_text,
      question.expected_keywords || [],
      userAnswer,
      question.question_type,
      question.points
    )
    
    // Calculate points earned
    const pointsEarned = Math.round(validation.score * question.points)
    
    // Save the answer
    const { data: answer, error: answerError } = await supabase
      .from('exam_answers')
      .insert({
        exam_session_id: examSessionId,
        question_id: questionId,
        user_answer: userAnswer,
        is_correct: validation.isCorrect,
        ai_feedback: validation.feedback,
        points_earned: pointsEarned
      })
      .select()
      .single()
    
    if (answerError) {
      console.error('Error saving answer:', answerError)
      throw answerError
    }
    
    return NextResponse.json({
      answerId: answer.id,
      isCorrect: validation.isCorrect,
      score: validation.score,
      pointsEarned,
      totalPoints: question.points,
      feedback: validation.feedback,
      keywordsFound: validation.keywordsFound,
      keywordsMissing: validation.keywordsMissing
    })
  } catch (error) {
    console.error('Error in validate API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
