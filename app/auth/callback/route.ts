import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')

    // Determine base URL for redirects
    const forwardedHost = request.headers.get('x-forwarded-host')
    const isLocalEnv = process.env.NODE_ENV === 'development'
    let baseUrl = origin
    if (!isLocalEnv && forwardedHost) {
        baseUrl = `https://${forwardedHost}`
    }

    if (!code) {
        return NextResponse.redirect(`${baseUrl}/login?error=auth_error`)
    }

    try {
        // Exchange code for session
        const supabase = await createClient()
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

        if (exchangeError) {
            console.error('Error exchanging code for session:', exchangeError)
            return NextResponse.redirect(`${baseUrl}/login?error=auth_error`)
        }

        // Get the authenticated user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user?.email) {
            console.error('Error getting user:', userError)
            return NextResponse.redirect(`${baseUrl}/login?error=auth_error`)
        }

        const userEmail = user.email.toLowerCase()
        const platformOwnerEmail = process.env.PLATFORM_OWNER_EMAIL?.toLowerCase()

        console.log('=== AUTH CALLBACK DEBUG ===')
        console.log('User email:', userEmail)
        console.log('Platform owner email:', platformOwnerEmail)
        console.log('Is platform owner:', platformOwnerEmail && userEmail === platformOwnerEmail)

        // ============================================
        // 1. CHECK IF PLATFORM OWNER
        // ============================================
        if (platformOwnerEmail && userEmail === platformOwnerEmail) {
            console.log('✅ Platform owner sign-in detected:', userEmail)
            
            // Ensure platform owner exists in users table
            const serviceSupabase = createServiceClient()
            const { data: existingUser } = await serviceSupabase
                .from('users')
                .select('id')
                .eq('id', user.id)
                .single()

            if (!existingUser) {
                // Create platform owner user record
                const { error: insertError } = await serviceSupabase
                    .from('users')
                    .upsert({
                        id: user.id,
                        email: userEmail,
                        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Platform Owner',
                        avatar_url: user.user_metadata?.avatar_url,
                        role: 'admin',
                        status: 'active',
                        org_id: null, // Platform owner has no org
                    }, {
                        onConflict: 'id'
                    })

                if (insertError) {
                    console.error('❌ Error creating platform owner user:', insertError)
                    console.error('Error details:', JSON.stringify(insertError, null, 2))
                    await supabase.auth.signOut()
                    return NextResponse.redirect(`${baseUrl}/login?error=auth_error`)
                }
                console.log('✅ Platform owner user created successfully')
            }

            return NextResponse.redirect(`${baseUrl}/platform-owner`)
        }

        // ============================================
        // 2. CHECK IF USER ALREADY EXISTS
        // ============================================
        const serviceSupabase = createServiceClient()
        const { data: existingUser } = await serviceSupabase
            .from('users')
            .select('id, org_id, role, status')
            .eq('id', user.id)
            .single()

        if (existingUser) {
            console.log('Existing user found:', { 
                id: existingUser.id, 
                org_id: existingUser.org_id, 
                role: existingUser.role, 
                status: existingUser.status 
            })

            // Check if user is suspended
            if (existingUser.status === 'suspended') {
                console.log('❌ User is suspended')
                await supabase.auth.signOut()
                return NextResponse.redirect(`${baseUrl}/login?error=account_suspended`)
            }

            // Check if user is pending approval
            if (existingUser.status === 'pending') {
                console.log('⏳ User is pending approval')
                return NextResponse.redirect(`${baseUrl}/pending-approval`)
            }

            // CRITICAL: Check if user belongs to an organization
            if (!existingUser.org_id) {
                console.log('❌ User has no organization')
                // User exists but has no organization - check for new pending invite
                const { data: pendingInvite } = await serviceSupabase
                    .from('invites')
                    .select('id, org_id, role, status, expires_at')
                    .eq('email', userEmail)
                    .eq('status', 'pending')
                    .gt('expires_at', new Date().toISOString())
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single()

                if (pendingInvite) {
                    console.log('✅ Found new pending invite - updating user')
                    // User has a new invite - update their org and role
                    await serviceSupabase
                        .from('users')
                        .update({
                            org_id: pendingInvite.org_id,
                            role: pendingInvite.role,
                            status: 'active'
                        })
                        .eq('id', user.id)

                    // Mark invite as accepted
                    await serviceSupabase
                        .from('invites')
                        .update({ 
                            status: 'accepted',
                            accepted_at: new Date().toISOString()
                        })
                        .eq('id', pendingInvite.id)

                    return NextResponse.redirect(`${baseUrl}/dashboard`)
                }

                // No organization and no pending invite - deny access
                console.log('❌ No organization and no pending invite - denying access')
                await supabase.auth.signOut()
                return NextResponse.redirect(`${baseUrl}/no-organization`)
            }

            // Active user with organization - redirect to dashboard
            console.log('✅ User has active organization access')
            if (existingUser.role === 'admin') {
                return NextResponse.redirect(`${baseUrl}/dashboard`)
            } else {
                return NextResponse.redirect(`${baseUrl}/dashboard`)
            }
        }

        // ============================================
        // 3. CHECK FOR PENDING INVITE
        // ============================================
        const { data: invite } = await serviceSupabase
            .from('invites')
            .select('id, org_id, role, status, expires_at')
            .eq('email', userEmail)
            .eq('status', 'pending')
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

        if (invite) {
            console.log('Found valid invite for:', userEmail)
            
            // Create user with invited role and org
            const { error: createError } = await serviceSupabase
                .from('users')
                .upsert({
                    id: user.id,
                    email: userEmail,
                    full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
                    avatar_url: user.user_metadata?.avatar_url,
                    org_id: invite.org_id,
                    role: invite.role,
                    status: 'active',
                }, {
                    onConflict: 'id'
                })

            if (createError) {
                console.error('Error creating user from invite:', createError)
                await supabase.auth.signOut()
                return NextResponse.redirect(`${baseUrl}/login?error=auth_error`)
            }

            // Mark invite as accepted
            await serviceSupabase
                .from('invites')
                .update({ 
                    status: 'accepted',
                    accepted_at: new Date().toISOString()
                })
                .eq('id', invite.id)

            // Redirect based on role
            return NextResponse.redirect(`${baseUrl}/dashboard`)
        }

        // ============================================
        // 4. CHECK EMAIL DOMAIN AGAINST ALLOWED DOMAINS
        // ============================================
        const emailDomain = userEmail.split('@')[1]
        
        const { data: matchingOrgs } = await serviceSupabase
            .from('organizations')
            .select('id, name, allowed_domains')
            .eq('is_active', true)

        let matchingOrg = null
        if (matchingOrgs) {
            for (const org of matchingOrgs) {
                if (org.allowed_domains && Array.isArray(org.allowed_domains)) {
                    if (org.allowed_domains.includes(emailDomain)) {
                        matchingOrg = org
                        break
                    }
                }
            }
        }

        if (matchingOrg) {
            console.log('Email domain matches org:', matchingOrg.name)
            
            // Create user as pending (requires admin approval)
            const { error: createError } = await serviceSupabase
                .from('users')
                .upsert({
                    id: user.id,
                    email: userEmail,
                    full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
                    avatar_url: user.user_metadata?.avatar_url,
                    org_id: matchingOrg.id,
                    role: 'employee',
                    status: 'pending',
                }, {
                    onConflict: 'id'
                })

            if (createError) {
                console.error('Error creating pending user:', createError)
                await supabase.auth.signOut()
                return NextResponse.redirect(`${baseUrl}/login?error=auth_error`)
            }

            return NextResponse.redirect(`${baseUrl}/pending-approval`)
        }

        // ============================================
        // 5. NO INVITE, NO DOMAIN MATCH - DENY ACCESS
        // ============================================
        console.log('❌ No organization found for:', userEmail)
        console.log('User has not been invited to any organization')
        await supabase.auth.signOut()
        return NextResponse.redirect(`${baseUrl}/no-organization`)

    } catch (error) {
        console.error('Unexpected error in auth callback:', error)
        return NextResponse.redirect(`${baseUrl}/login?error=auth_error`)
    }
}
