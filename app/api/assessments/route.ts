import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { CreateAssessmentInput, AssessmentQuestion } from "@/lib/types/assessments"

// GET /api/assessments - List all assessments for the current user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user role to determine access pattern
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()

    // Get query params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")

    // Build query based on role
    let query = supabase
      .from("assessments")
      .select(`
        *,
        employee:users!assessments_employee_id_fkey(id, email, full_name, avatar_url, position),
        assessment_type:assessment_types(*)
      `)
      .order("created_at", { ascending: false })

    // Admins see assessments they created, employees see assessments assigned to them
    if (userData?.role === "admin") {
      query = query.eq("user_id", user.id)
    } else {
      // Employees only see assessments that have been sent to them (not drafts)
      query = query.eq("employee_id", user.id).neq("status", "draft")
    }

    // Filter by status if provided
    if (status && status !== "all") {
      query = query.eq("status", status)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching assessments:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error in GET /api/assessments:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/assessments - Create a new assessment with questions
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's org_id and role
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("org_id, role")
      .eq("id", user.id)
      .single()

    if (userError || !userData) {
      console.error("Error fetching user data:", userError)
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (!userData.org_id) {
      return NextResponse.json({ error: "User is not part of an organization" }, { status: 403 })
    }

    if (userData.role !== "admin") {
      return NextResponse.json({ error: "Only admins can create assessments" }, { status: 403 })
    }

    // Parse request body
    const body: CreateAssessmentInput & { questions: AssessmentQuestion[] } = await request.json()

    // Validate required fields
    if (!body.title || body.title.trim() === "") {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }
    if (!body.employee_id) {
      return NextResponse.json({ error: "Employee is required" }, { status: 400 })
    }
    if (!body.topic_ids || body.topic_ids.length === 0) {
      return NextResponse.json({ error: "At least one topic is required" }, { status: 400 })
    }
    if (!body.questions || body.questions.length === 0) {
      return NextResponse.json({ error: "Questions are required" }, { status: 400 })
    }

    // Calculate total points
    const totalPoints = body.questions.reduce((sum, q) => sum + (q.points || 10), 0)

    // Create the assessment
    const { data: assessment, error: assessmentError } = await supabase
      .from("assessments")
      .insert({
        user_id: user.id,
        org_id: userData.org_id,
        title: body.title.trim(),
        assessment_type_id: body.assessment_type_id || null,
        employee_id: body.employee_id,
        difficulty: body.difficulty || "medium",
        passing_score: body.passing_score || 70,
        questions_per_topic: body.questions_per_topic || 5,
        due_date: body.due_date || null,
        total_points: totalPoints,
        status: "draft",
      })
      .select()
      .single()

    if (assessmentError) {
      console.error("Error creating assessment:", assessmentError)
      return NextResponse.json({ error: assessmentError.message }, { status: 500 })
    }

    // Create assessment topics
    const topicsData = body.topic_ids.map((topic_id) => ({
      assessment_id: assessment.id,
      topic_id,
      questions_count: body.questions_per_topic || 5,
    }))

    const { error: topicsError } = await supabase
      .from("assessment_topics")
      .insert(topicsData)

    if (topicsError) {
      console.error("Error creating assessment topics:", topicsError)
      // Clean up the assessment if topics fail
      await supabase.from("assessments").delete().eq("id", assessment.id)
      return NextResponse.json({ error: topicsError.message }, { status: 500 })
    }

    // Create assessment questions
    const questionsData = body.questions.map((question, index) => ({
      assessment_id: assessment.id,
      topic_id: question.topic_id || null,
      question_text: question.question_text,
      question_type: question.question_type || "open_ended",
      options: question.options || [],
      correct_answer: question.correct_answer || null,
      expected_keywords: question.expected_keywords || [],
      explanation: question.explanation || null,
      difficulty: question.difficulty || body.difficulty || "medium",
      points: question.points || 10,
      order_index: index,
      source_chunk_text: question.source_chunk_text || null,
    }))

    const { error: questionsError } = await supabase
      .from("assessment_questions")
      .insert(questionsData)

    if (questionsError) {
      console.error("Error creating assessment questions:", questionsError)
      // Clean up
      await supabase.from("assessment_topics").delete().eq("assessment_id", assessment.id)
      await supabase.from("assessments").delete().eq("id", assessment.id)
      return NextResponse.json({ error: questionsError.message }, { status: 500 })
    }

    return NextResponse.json({ data: assessment }, { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/assessments:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
