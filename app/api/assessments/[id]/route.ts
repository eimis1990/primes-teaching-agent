import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { UpdateAssessmentInput } from "@/lib/types/assessments"

// GET /api/assessments/[id] - Get a single assessment with details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // Build query based on role
    let query = supabase
      .from("assessments")
      .select(`
        *,
        employee:users!assessments_employee_id_fkey(id, email, full_name, avatar_url, position),
        assessment_type:assessment_types(*)
      `)
      .eq("id", id)

    // Admins see assessments they created, employees see assessments assigned to them
    if (userData?.role === "admin") {
      query = query.eq("user_id", user.id)
    } else {
      query = query.eq("employee_id", user.id)
    }

    const { data: assessment, error: assessmentError } = await query.single()

    if (assessmentError) {
      console.error("Error fetching assessment:", assessmentError)
      if (assessmentError.code === "PGRST116") {
        return NextResponse.json({ error: "Assessment not found" }, { status: 404 })
      }
      return NextResponse.json({ error: assessmentError.message }, { status: 500 })
    }

    // Fetch topics
    const { data: topics, error: topicsError } = await supabase
      .from("assessment_topics")
      .select(`
        *,
        topic:topics(id, title, description)
      `)
      .eq("assessment_id", id)

    if (topicsError) {
      console.error("Error fetching topics:", topicsError)
    }

    // For employees taking the assessment, start it if status is "sent"
    if (userData?.role === "employee" && assessment.status === "sent") {
      const { error: updateError } = await supabase
        .from("assessments")
        .update({
          status: "in_progress",
          started_at: new Date().toISOString(),
        })
        .eq("id", id)

      if (!updateError) {
        assessment.status = "in_progress"
        assessment.started_at = new Date().toISOString()
      }
    }

    // Fetch questions
    let questionsSelect = "*"
    
    // For employees taking the assessment (not completed), hide correct answers
    if (userData?.role === "employee" && assessment.status !== "completed") {
      questionsSelect = "id, question_text, question_type, options, points, order_index, difficulty"
    }

    const { data: questions, error: questionsError } = await supabase
      .from("assessment_questions")
      .select(questionsSelect)
      .eq("assessment_id", id)
      .order("order_index", { ascending: true })

    if (questionsError) {
      console.error("Error fetching questions:", questionsError)
    }

    // Fetch answers if in progress or completed
    let answers = null
    if (assessment.status === "completed" || assessment.status === "in_progress") {
      const { data: answersData, error: answersError } = await supabase
        .from("assessment_answers")
        .select("*")
        .eq("assessment_id", id)

      if (!answersError) {
        answers = answersData
      }
    }

    // Return data in consistent format with questions and topics attached
    return NextResponse.json({
      data: {
        ...assessment,
        questions: questions || [],
        topics: topics || [],
        answers: answers,
      }
    })
  } catch (error) {
    console.error("Error in GET /api/assessments/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/assessments/[id] - Update an assessment
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user role
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()

    // Parse request body
    const body: UpdateAssessmentInput = await request.json()

    // Build update object
    const updateData: Record<string, unknown> = {}
    
    // Only admins can update assessment metadata
    if (userData?.role === "admin") {
      if (body.title !== undefined) updateData.title = body.title.trim()
      if (body.assessment_type_id !== undefined) updateData.assessment_type_id = body.assessment_type_id || null
      if (body.due_date !== undefined) updateData.due_date = body.due_date || null
      if (body.difficulty !== undefined) updateData.difficulty = body.difficulty
      if (body.passing_score !== undefined) updateData.passing_score = body.passing_score
    }
    
    // Both admins and employees can update status (employees for starting/completing)
    if (body.status !== undefined) updateData.status = body.status

    // Build query based on role
    let updateQuery = supabase
      .from("assessments")
      .update(updateData)
      .eq("id", id)

    // Admins update their own assessments, employees update assessments assigned to them
    if (userData?.role === "admin") {
      updateQuery = updateQuery.eq("user_id", user.id)
    } else {
      updateQuery = updateQuery.eq("employee_id", user.id)
    }

    const { data, error } = await updateQuery.select().single()

    if (error) {
      console.error("Error updating assessment:", error)
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Assessment not found" }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error in PUT /api/assessments/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/assessments/[id] - Delete an assessment (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user role
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()

    // Only admins can delete assessments
    if (userData?.role !== "admin") {
      return NextResponse.json({ error: "Only admins can delete assessments" }, { status: 403 })
    }

    // Delete the assessment (cascades to topics, questions, answers)
    const { error } = await supabase
      .from("assessments")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)

    if (error) {
      console.error("Error deleting assessment:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE /api/assessments/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
