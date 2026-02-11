import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

// GET /api/organizations/:id - Get organization details (platform owner only)
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

    // Await params (Next.js 15+)
    const { id } = await params

    // Use service client for database operations (bypasses RLS)
    const serviceSupabase = createServiceClient()

    const { data: organization, error } = await serviceSupabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching organization:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Get user counts
    const { count: userCount } = await serviceSupabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', organization.id)

    const { count: adminCount } = await serviceSupabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', organization.id)
      .eq('role', 'admin')

    return NextResponse.json({
      ...organization,
      user_count: userCount || 0,
      admin_count: adminCount || 0,
    })
  } catch (error) {
    console.error('Error in GET /api/organizations/:id:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH /api/organizations/:id - Update organization (platform owner only)
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

    // Await params (Next.js 15+)
    const { id } = await params

    const body = await request.json()
    const { name, slug, allowed_domains, settings, is_active } = body

    // Use service client for database operations (bypasses RLS)
    const serviceSupabase = createServiceClient()

    // Validate slug format if provided
    if (slug) {
      const slugRegex = /^[a-z0-9-]+$/
      if (!slugRegex.test(slug)) {
        return NextResponse.json(
          { error: 'Slug must contain only lowercase letters, numbers, and hyphens' },
          { status: 400 }
        )
      }

      // Check if slug already exists (excluding current org)
      const { data: existingOrg } = await serviceSupabase
        .from('organizations')
        .select('id')
        .eq('slug', slug)
        .neq('id', id)
        .single()

      if (existingOrg) {
        return NextResponse.json(
          { error: 'An organization with this slug already exists' },
          { status: 409 }
        )
      }
    }

    // Build update object
    const updates: any = {}
    if (name !== undefined) updates.name = name
    if (slug !== undefined) updates.slug = slug
    if (allowed_domains !== undefined) updates.allowed_domains = allowed_domains
    if (settings !== undefined) updates.settings = settings
    if (is_active !== undefined) updates.is_active = is_active

    // Update organization
    const { data: updatedOrg, error: updateError } = await serviceSupabase
      .from('organizations')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating organization:', updateError)
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json(updatedOrg)
  } catch (error) {
    console.error('Error in PATCH /api/organizations/:id:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/organizations/:id - Delete organization (platform owner only)
export async function DELETE(
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

    // Await params (Next.js 15+)
    const { id } = await params

    // Use service client for database operations (bypasses RLS)
    const serviceSupabase = createServiceClient()

    // Delete organization (CASCADE will handle related records)
    const { error: deleteError } = await serviceSupabase
      .from('organizations')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting organization:', deleteError)
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Organization deleted successfully' })
  } catch (error) {
    console.error('Error in DELETE /api/organizations/:id:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
