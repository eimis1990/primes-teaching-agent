import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// GET /api/organizations - List all organizations (platform owner only)
export async function GET(request: NextRequest) {
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

    // Use service client for database operations (bypasses RLS)
    const serviceSupabase = createServiceClient()

    // Fetch all organizations
    const { data: organizations, error } = await serviceSupabase
      .from('organizations')
      .select(`
        *,
        users:users(count)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching organizations:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get user counts for each organization
    const orgsWithCounts = await Promise.all(
      organizations.map(async (org) => {
        const { count: userCount } = await serviceSupabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', org.id)

        const { count: adminCount } = await serviceSupabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', org.id)
          .eq('role', 'admin')

        return {
          ...org,
          user_count: userCount || 0,
          admin_count: adminCount || 0,
        }
      })
    )

    return NextResponse.json(orgsWithCounts)
  } catch (error) {
    console.error('Error in GET /api/organizations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/organizations - Create new organization (platform owner only)
export async function POST(request: NextRequest) {
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

    // Parse request body
    const body = await request.json()
    const { name, slug, allowed_domains, settings } = body

    // Validate required fields
    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 }
      )
    }

    // Validate slug format (lowercase, alphanumeric, hyphens only)
    const slugRegex = /^[a-z0-9-]+$/
    if (!slugRegex.test(slug)) {
      return NextResponse.json(
        { error: 'Slug must contain only lowercase letters, numbers, and hyphens' },
        { status: 400 }
      )
    }

    // Use service client for database operations (bypasses RLS)
    const serviceSupabase = createServiceClient()

    // Check if slug already exists
    const { data: existingOrg, error: checkError } = await serviceSupabase
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .single()

    if (existingOrg) {
      return NextResponse.json(
        { error: 'An organization with this slug already exists' },
        { status: 409 }
      )
    }

    // Create organization
    const { data: newOrg, error: createError } = await serviceSupabase
      .from('organizations')
      .insert({
        name,
        slug,
        allowed_domains: allowed_domains || [],
        settings: settings || {},
        is_active: true,
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating organization:', createError)
      return NextResponse.json(
        { error: createError.message },
        { status: 500 }
      )
    }

    return NextResponse.json(newOrg, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/organizations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
