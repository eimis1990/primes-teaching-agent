import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET /api/assessments/unread-count - Get count of new/unread assessments for employee
export async function GET(request: NextRequest) {
  try {
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

    // Only employees have "unread" assessments
    // Admins see all assessments they created, not unread counts
    if (userData?.role !== "employee") {
      return NextResponse.json({ count: 0 })
    }

    // Count assessments that are "sent" (new) or "in_progress" for this employee
    const { count, error } = await supabase
      .from("assessments")
      .select("*", { count: "exact", head: true })
      .eq("employee_id", user.id)
      .in("status", ["sent", "in_progress"])

    if (error) {
      console.error("Error counting assessments:", error)
      return NextResponse.json({ count: 0 })
    }

    return NextResponse.json({ count: count || 0 })
  } catch (error) {
    console.error("Error in GET /api/assessments/unread-count:", error)
    return NextResponse.json({ count: 0 })
  }
}
