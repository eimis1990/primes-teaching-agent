import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { evaluateAnswers } from "@/lib/ai/evaluate-answer"

// POST /api/assessments/[id]/submit - Submit assessment answers
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: assessmentId } = await params
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user profile to verify role
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()

    if (userData?.role !== "employee") {
      return NextResponse.json({ error: "Only employees can submit assessments" }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const { answers } = body

    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json({ error: "Invalid answers format" }, { status: 400 })
    }

    // Verify the assessment belongs to this employee
    const { data: assessment, error: assessmentError } = await supabase
      .from("assessments")
      .select("id, employee_id, status, passing_score")
      .eq("id", assessmentId)
      .eq("employee_id", user.id)
      .single()

    if (assessmentError || !assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 })
    }

    if (assessment.status === "completed") {
      return NextResponse.json({ error: "Assessment already submitted" }, { status: 400 })
    }

    // Get all questions with full details for AI evaluation
    const { data: questions, error: questionsError } = await supabase
      .from("assessment_questions")
      .select("id, question_text, correct_answer, points, question_type, options")
      .eq("assessment_id", assessmentId)

    if (questionsError || !questions) {
      return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 })
    }

    // Use AI to evaluate all answers
    console.log("🤖 Evaluating answers with Gemini AI...")
    console.log("Questions received:", questions.map(q => ({ 
      id: q.id, 
      type: q.question_type, 
      correct_answer: q.correct_answer,
      options: q.options 
    })))
    console.log("User answers:", answers)
    
    const evaluationResults = await evaluateAnswers(questions, answers)

    // Calculate score and prepare answers to save
    let earnedPoints = 0
    let totalPoints = 0
    const answersToSave = []

    for (const question of questions) {
      totalPoints += question.points || 0
      const userAnswer = answers.find((a: any) => a.question_id === question.id)
      const evaluation = evaluationResults.get(question.id)

      console.log(`Question ${question.id}:`, {
        type: question.question_type,
        userAnswer: userAnswer?.selected_option_id || userAnswer?.answer_text,
        correct: question.correct_answer,
        evaluation: evaluation
      })

      if (evaluation) {
        earnedPoints += evaluation.pointsEarned

        answersToSave.push({
          assessment_id: assessmentId,
          question_id: question.id,
          employee_id: user.id,
          answer_text: userAnswer?.answer_text || "",
          selected_option_id: userAnswer?.selected_option_id || null,
          is_correct: evaluation.isCorrect,
          points_earned: evaluation.pointsEarned,
          ai_feedback: evaluation.feedback, // Store AI feedback
        })
      }
    }

    console.log(`✅ AI Evaluation complete: ${earnedPoints}/${totalPoints} points`)

    // Calculate percentage score
    const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0

    // Delete existing answers first (in case of resubmit)
    await supabase
      .from("assessment_answers")
      .delete()
      .eq("assessment_id", assessmentId)
      .eq("employee_id", user.id)

    // Save all new answers
    const { error: answersError } = await supabase
      .from("assessment_answers")
      .insert(answersToSave)

    if (answersError) {
      console.error("Error saving answers:", answersError)
      return NextResponse.json({ error: "Failed to save answers" }, { status: 500 })
    }

    // Update assessment status
    const { error: updateError } = await supabase
      .from("assessments")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        score,
        earned_points: earnedPoints,
      })
      .eq("id", assessmentId)

    if (updateError) {
      console.error("Error updating assessment:", updateError)
      return NextResponse.json({ error: "Failed to update assessment" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      score,
      earned_points: earnedPoints,
      total_points: totalPoints,
      passed: score >= assessment.passing_score,
    })
  } catch (error) {
    console.error("Error in POST /api/assessments/[id]/submit:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
