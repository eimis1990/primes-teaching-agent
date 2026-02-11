import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { CreateAssessmentTypeInput, UpdateAssessmentTypeInput } from "@/lib/types/assessments"

// GET /api/assessments/types - List all assessment types for the current user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch assessment types
    const { data, error } = await supabase
      .from("assessment_types")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching assessment types:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error in GET /api/assessments/types:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/assessments/types - Create a new assessment type
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
      return NextResponse.json({ error: "Only admins can create assessment types" }, { status: 403 })
    }

    // Parse request body
    const body: CreateAssessmentTypeInput = await request.json()

    // Validate required fields
    if (!body.name || body.name.trim() === "") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    // Create the assessment type
    const { data, error } = await supabase
      .from("assessment_types")
      .insert({
        user_id: user.id,
        org_id: userData.org_id,
        name: body.name.trim(),
        description: body.description?.trim() || null,
        color: body.color || "#6366f1",
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating assessment type:", error)
      if (error.code === "23505") {
        return NextResponse.json({ error: "An assessment type with this name already exists" }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/assessments/types:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/assessments/types - Update an assessment type (expects id in body)
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse request body
    const body: UpdateAssessmentTypeInput & { id: string } = await request.json()

    if (!body.id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 })
    }

    // Build update object
    const updateData: Record<string, unknown> = {}
    if (body.name !== undefined) updateData.name = body.name.trim()
    if (body.description !== undefined) updateData.description = body.description?.trim() || null
    if (body.color !== undefined) updateData.color = body.color
    if (body.is_active !== undefined) updateData.is_active = body.is_active

    // Update the assessment type
    const { data, error } = await supabase
      .from("assessment_types")
      .update(updateData)
      .eq("id", body.id)
      .eq("user_id", user.id)
      .select()
      .single()

    if (error) {
      console.error("Error updating assessment type:", error)
      if (error.code === "23505") {
        return NextResponse.json({ error: "An assessment type with this name already exists" }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "Assessment type not found" }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error in PUT /api/assessments/types:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/assessments/types - Delete an assessment type (expects id in query params)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get ID from query params
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 })
    }

    // Delete the assessment type
    const { error } = await supabase
      .from("assessment_types")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)

    if (error) {
      console.error("Error deleting assessment type:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE /api/assessments/types:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
