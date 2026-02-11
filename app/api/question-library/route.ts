import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { CreateQuestionLibraryInput, QuestionLibrary } from "@/lib/types/assessments"

// GET /api/question-library - Fetch questions from library (filtered by topic_ids)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const topicIdsParam = searchParams.get("topic_ids")
    const difficulty = searchParams.get("difficulty")
    const activeOnly = searchParams.get("active_only") !== "false"

    // Build query
    let query = supabase
      .from("question_library")
      .select(`
        *,
        topic:topics(id, title)
      `)
      .eq("user_id", user.id)

    // Filter by topic IDs if provided
    if (topicIdsParam) {
      const topicIds = topicIdsParam.split(",").filter(Boolean)
      if (topicIds.length > 0) {
        query = query.in("topic_id", topicIds)
      }
    }

    // Filter by difficulty if provided
    if (difficulty) {
      query = query.eq("difficulty", difficulty)
    }

    // Filter by active status
    if (activeOnly) {
      query = query.eq("is_active", true)
    }

    // Order by most recently created
    query = query.order("created_at", { ascending: false })

    const { data: questions, error } = await query

    if (error) {
      console.error("Error fetching question library:", error)
      return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 })
    }

    return NextResponse.json({ data: questions || [] })
  } catch (error) {
    console.error("Error in GET /api/question-library:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/question-library - Save approved questions to library
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
      return NextResponse.json({ error: "Only admins can save questions to library" }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()
    const questions: CreateQuestionLibraryInput[] = Array.isArray(body.questions) 
      ? body.questions 
      : [body]

    if (questions.length === 0) {
      return NextResponse.json({ error: "No questions provided" }, { status: 400 })
    }

    // Prepare questions with user_id and org_id
    const questionsToInsert = questions.map(q => ({
      user_id: user.id,
      org_id: userData.org_id,
      topic_id: q.topic_id,
      question_text: q.question_text,
      question_type: q.question_type,
      options: q.options || [],
      correct_answer: q.correct_answer,
      expected_keywords: q.expected_keywords || [],
      explanation: q.explanation,
      difficulty: q.difficulty,
      points: q.points,
      source_chunk_text: q.source_chunk_text,
    }))

    // Insert questions
    const { data, error } = await supabase
      .from("question_library")
      .insert(questionsToInsert)
      .select()

    if (error) {
      console.error("Error saving questions to library:", error)
      return NextResponse.json({ error: "Failed to save questions" }, { status: 500 })
    }

    return NextResponse.json({ 
      data, 
      message: `Successfully saved ${data?.length || 0} questions to library` 
    })
  } catch (error) {
    console.error("Error in POST /api/question-library:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/question-library - Delete or deactivate questions
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const questionId = searchParams.get("id")
    const soft = searchParams.get("soft") === "true"

    if (!questionId) {
      return NextResponse.json({ error: "Question ID required" }, { status: 400 })
    }

    if (soft) {
      // Soft delete - just mark as inactive
      const { error } = await supabase
        .from("question_library")
        .update({ is_active: false })
        .eq("id", questionId)
        .eq("user_id", user.id)

      if (error) {
        console.error("Error deactivating question:", error)
        return NextResponse.json({ error: "Failed to deactivate question" }, { status: 500 })
      }
    } else {
      // Hard delete
      const { error } = await supabase
        .from("question_library")
        .delete()
        .eq("id", questionId)
        .eq("user_id", user.id)

      if (error) {
        console.error("Error deleting question:", error)
        return NextResponse.json({ error: "Failed to delete question" }, { status: 500 })
      }
    }

    return NextResponse.json({ message: "Question removed successfully" })
  } catch (error) {
    console.error("Error in DELETE /api/question-library:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
