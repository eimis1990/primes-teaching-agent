import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// POST /api/assessments/[id]/send - Send an assessment to the employee
export async function POST(
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

    // Check current assessment status
    const { data: assessment, error: fetchError } = await supabase
      .from("assessments")
      .select("status")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()

    if (fetchError) {
      console.error("Error fetching assessment:", fetchError)
      if (fetchError.code === "PGRST116") {
        return NextResponse.json({ error: "Assessment not found" }, { status: 404 })
      }
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (assessment.status !== "draft") {
      return NextResponse.json({
        error: `Cannot send assessment. Current status is "${assessment.status}". Only draft assessments can be sent.`,
      }, { status: 400 })
    }

    // Update status to sent
    const { data, error } = await supabase
      .from("assessments")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single()

    if (error) {
      console.error("Error sending assessment:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error in POST /api/assessments/[id]/send:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
