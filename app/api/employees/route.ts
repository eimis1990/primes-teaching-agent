import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET /api/employees - List all employees in the current user's organization
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get current user's profile to find their org_id
    const { data: profile } = await supabase
      .from("users")
      .select("org_id, role")
      .eq("id", user.id)
      .single()

    if (!profile?.org_id) {
      return NextResponse.json({ error: "User not associated with an organization" }, { status: 403 })
    }

    // Only admins can view employees
    if (profile.role !== 'admin') {
      return NextResponse.json({ error: "Only administrators can view employees" }, { status: 403 })
    }

    // Get search query if provided
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""

    // Build query - get all organization members we can manage on this screen
    let query = supabase
      .from("users")
      .select("id, email, full_name, role, position, avatar_url, is_active, status, last_login_at, created_at, updated_at")
      .eq("org_id", profile.org_id)
      .in("role", ["employee", "admin"])
      .order("created_at", { ascending: false })

    // Add search filter if provided
    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching employees:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error in GET /api/employees:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST is now handled by /api/invites (invite system)
// Keeping this for backward compatibility but it will create an invite instead
export async function POST(request: NextRequest) {
  try {
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

    // Only admins can invite employees
    if (profile.role !== 'admin') {
      return NextResponse.json({ error: "Only administrators can invite employees" }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()

    // Validate required fields
    if (!body.email || !body.email.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const email = body.email.trim().toLowerCase()

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single()

    if (existingUser) {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 })
    }

    // Check if there's already a pending invite
    const { data: existingInvite } = await supabase
      .from("invites")
      .select("id")
      .eq("email", email)
      .eq("org_id", profile.org_id)
      .eq("status", "pending")
      .single()

    if (existingInvite) {
      return NextResponse.json({ error: "An invite for this email is already pending" }, { status: 409 })
    }

    // Create invite
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days from now

    const { data, error } = await supabase
      .from("invites")
      .insert({
        org_id: profile.org_id,
        email: email,
        role: 'employee',
        invited_by: user.id,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating invite:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      data,
      message: "Invite sent successfully. The user will be able to sign in with Google using this email."
    }, { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/employees:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
