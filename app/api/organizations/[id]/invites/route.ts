import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// GET /api/organizations/:id/invites - List invites for organization
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

    const { data: invites, error } = await serviceSupabase
      .from('invites')
      .select('*')
      .eq('org_id', id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching invites:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(invites)
  } catch (error) {
    console.error('Error in GET /api/organizations/:id/invites:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/organizations/:id/invites - Create invite for admin
export async function POST(
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
    const { email, role = 'admin' } = body

    // Validate email
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate role
    if (role !== 'admin' && role !== 'employee') {
      return NextResponse.json(
        { error: 'Role must be admin or employee' },
        { status: 400 }
      )
    }

    // Use service client for database operations
    const serviceSupabase = createServiceClient()

    // Check if organization exists
    const { data: org, error: orgError } = await serviceSupabase
      .from('organizations')
      .select('id, name')
      .eq('id', id)
      .single()

    if (orgError || !org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Check if user already exists in this organization
    const { data: existingUser } = await serviceSupabase
      .from('users')
      .select('id, email, role')
      .eq('email', email.toLowerCase())
      .eq('org_id', id)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists in this organization' },
        { status: 409 }
      )
    }

    // Check if invite already exists
    const { data: existingInvite } = await serviceSupabase
      .from('invites')
      .select('id, status')
      .eq('org_id', id)
      .eq('email', email.toLowerCase())
      .single()

    if (existingInvite) {
      if (existingInvite.status === 'pending') {
        return NextResponse.json(
          { error: 'An invite is already pending for this email' },
          { status: 409 }
        )
      }
      // If invite is expired or cancelled, we can create a new one
    }

    // Create invite
    const { data: newInvite, error: createError } = await serviceSupabase
      .from('invites')
      .insert({
        org_id: id,
        email: email.toLowerCase(),
        role: role,
        invited_by: user.id,
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating invite:', createError)
      return NextResponse.json(
        { error: createError.message },
        { status: 500 }
      )
    }

    return NextResponse.json(newInvite, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/organizations/:id/invites:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
