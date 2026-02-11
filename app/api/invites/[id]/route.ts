import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"

// DELETE /api/invites/[id] - Cancel an invite
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is platform owner
    const platformOwnerEmail = process.env.PLATFORM_OWNER_EMAIL?.toLowerCase()
    if (user.email?.toLowerCase() !== platformOwnerEmail) {
      return NextResponse.json({ error: 'Forbidden - Platform owner access only' }, { status: 403 })
    }

    // Use service client for database operations (bypasses RLS)
    const serviceSupabase = createServiceClient()

    // Update invite status to cancelled
    const { error } = await serviceSupabase
      .from("invites")
      .update({ status: 'cancelled' })
      .eq("id", id)

    if (error) {
      console.error("Error cancelling invite:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Invite cancelled successfully' })
  } catch (error) {
    console.error("Error in DELETE /api/invites/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/invites/[id] - Resend an invite (extend expiration)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is platform owner
    const platformOwnerEmail = process.env.PLATFORM_OWNER_EMAIL?.toLowerCase()
    if (user.email?.toLowerCase() !== platformOwnerEmail) {
      return NextResponse.json({ error: 'Forbidden - Platform owner access only' }, { status: 403 })
    }

    // Use service client for database operations (bypasses RLS)
    const serviceSupabase = createServiceClient()

    // Extend expiration by 7 days
    const newExpiresAt = new Date()
    newExpiresAt.setDate(newExpiresAt.getDate() + 7)

    const { data, error } = await serviceSupabase
      .from("invites")
      .update({ 
        expires_at: newExpiresAt.toISOString(),
        status: 'pending' // Reset to pending if it was expired
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      console.error("Error resending invite:", error)
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Invite not found" }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      data,
      message: "Invite resent successfully"
    })
  } catch (error) {
    console.error("Error in PUT /api/invites/[id]:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
