import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET /api/employees/[id] - Get a single employee
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    console.log(`🔍 GET /api/employees/${id}`)
    
    const supabase = await createClient()

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error(`❌ Auth error:`, authError)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log(`👤 Current user: ${user.id}`)

    // Get current user's profile to find their org_id
    const { data: profile } = await supabase
      .from("users")
      .select("org_id, role")
      .eq("id", user.id)
      .single()

    if (!profile?.org_id) {
      return NextResponse.json({ error: "User not associated with an organization" }, { status: 403 })
    }

    // Only admins can view employee details
    if (profile.role !== 'admin') {
      return NextResponse.json({ error: "Only administrators can view employee details" }, { status: 403 })
    }

    // Fetch the employee (must be in same org and have an editable role)
    const { data, error } = await supabase
      .from("users")
      .select("id, email, full_name, role, position, avatar_url, is_active, status, last_login_at, created_at, updated_at")
      .eq("id", id)
      .eq("org_id", profile.org_id)
      .in("role", ["employee", "admin"])
      .single()

    if (error) {
      console.error("❌ Error fetching employee:", error)
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Employee not found" }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`✅ Employee fetched successfully: ${data.full_name}`)
    return NextResponse.json({ data })
  } catch (error) {
    console.error("❌ Error in GET /api/employees/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/employees/[id] - Update an employee
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

    // Get current user's profile
    const { data: profile } = await supabase
      .from("users")
      .select("org_id, role")
      .eq("id", user.id)
      .single()

    if (!profile?.org_id) {
      return NextResponse.json({ error: "User not associated with an organization" }, { status: 403 })
    }

    // Only admins can update employees
    if (profile.role !== 'admin') {
      return NextResponse.json({ error: "Only administrators can update employees" }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()

    // Build update object (name/email are intentionally not editable here)
    const updateData: Record<string, unknown> = {}
    if (body.position !== undefined) updateData.position = body.position?.trim() || null
    if (body.role !== undefined) {
      if (!['admin', 'employee'].includes(body.role)) {
        return NextResponse.json({ error: "Role must be admin or employee" }, { status: 400 })
      }
      if (id === user.id) {
        return NextResponse.json({ error: "You cannot change your own role" }, { status: 400 })
      }
      updateData.role = body.role
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
    }

    // Update the employee
    const { data, error } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", id)
      .eq("org_id", profile.org_id)
      .in("role", ["employee", "admin"])
      .select("id, email, full_name, role, position, avatar_url, is_active, status, last_login_at, created_at, updated_at")
      .single()

    if (error) {
      console.error("Error updating employee:", error)
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Employee not found" }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error in PUT /api/employees/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/employees/[id] - Delete an employee
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

    // Get current user's profile
    const { data: profile } = await supabase
      .from("users")
      .select("org_id, role")
      .eq("id", user.id)
      .single()

    if (!profile?.org_id) {
      return NextResponse.json({ error: "User not associated with an organization" }, { status: 403 })
    }

    // Only admins can delete employees
    if (profile.role !== 'admin') {
      return NextResponse.json({ error: "Only administrators can delete employees" }, { status: 403 })
    }

    // Delete the employee (Supabase Auth user will remain, but they'll have no org access)
    const { error } = await supabase
      .from("users")
      .delete()
      .eq("id", id)
      .eq("org_id", profile.org_id)
      .eq("role", "employee")

    if (error) {
      console.error("Error deleting employee:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in DELETE /api/employees/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
