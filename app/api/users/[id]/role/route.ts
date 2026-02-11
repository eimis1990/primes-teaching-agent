import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// PATCH /api/users/:id/role - Update user role
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is platform owner
    const platformOwnerEmail = process.env.PLATFORM_OWNER_EMAIL?.toLowerCase()
    if (user.email?.toLowerCase() !== platformOwnerEmail) {
      return NextResponse.json({ error: 'Forbidden - Platform owner access only' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { role } = body

    // Validate role
    if (role !== 'admin' && role !== 'employee') {
      return NextResponse.json(
        { error: 'Role must be admin or employee' },
        { status: 400 }
      )
    }

    // Use service client for database operations
    const serviceSupabase = createServiceClient()

    // Update user role
    const { data: updatedUser, error: updateError } = await serviceSupabase
      .from('users')
      .update({ role })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating user role:', updateError)
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Error in PATCH /api/users/:id/role:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
