import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// GET /api/organizations/:id/users - List users in organization
export async function GET(
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

    // Use service client for database operations
    const serviceSupabase = createServiceClient()

    const { data: users, error } = await serviceSupabase
      .from('users')
      .select('id, email, full_name, role, status, position, created_at, last_login_at')
      .eq('org_id', id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(users)
  } catch (error) {
    console.error('Error in GET /api/organizations/:id/users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
