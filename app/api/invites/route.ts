import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET /api/invites - List all invites for the current user's organization
export async function GET(request: NextRequest) {
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

    // Only admins can view invites
    if (profile.role !== 'admin') {
      return NextResponse.json({ error: "Only administrators can view invites" }, { status: 403 })
    }

    // Get search and status filters
    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") || null

    // Build query
    let query = supabase
      .from("invites")
      .select("*, invited_by_user:users!invites_invited_by_fkey(full_name, email)")
      .eq("org_id", profile.org_id)
      .order("created_at", { ascending: false })

    // Add status filter if provided
    if (status && ['pending', 'accepted', 'expired', 'cancelled'].includes(status)) {
      query = query.eq("status", status)
    }

    // Add search filter if provided
    if (search) {
      query = query.ilike("email", `%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching invites:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error("Error in GET /api/invites:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/invites - Create a new invite
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

    // Only admins can create invites
    if (profile.role !== 'admin') {
      return NextResponse.json({ error: "Only administrators can create invites" }, { status: 403 })
    }

    // Parse request body
    const body = await request.json()

    // Validate required fields
    if (!body.email || !body.email.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // Validate role
    if (!body.role || !['admin', 'employee'].includes(body.role)) {
      return NextResponse.json({ error: "Valid role is required (admin or employee)" }, { status: 400 })
    }

    const email = body.email.trim().toLowerCase()

    // Check if user already exists with this email
    const { data: existingUser } = await supabase
      .from("users")
      .select("id, org_id")
      .eq("email", email)
      .single()

    if (existingUser) {
      if (existingUser.org_id === profile.org_id) {
        return NextResponse.json({ error: "A user with this email already exists in your organization" }, { status: 409 })
      } else if (existingUser.org_id) {
        return NextResponse.json({ error: "This email is already associated with another organization" }, { status: 409 })
      }
    }

    // Check if there's already a pending invite for this email in this org
    const { data: existingInvite } = await supabase
      .from("invites")
      .select("id, status")
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
        role: body.role,
        invited_by: user.id,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
      })
      .select("*, invited_by_user:users!invites_invited_by_fkey(full_name, email)")
      .single()

    if (error) {
      console.error("Error creating invite:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      data,
      message: "Invite sent successfully. The user can now sign in with Google using this email."
    }, { status: 201 })
  } catch (error) {
    console.error("Error in POST /api/invites:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
