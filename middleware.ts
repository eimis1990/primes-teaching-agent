import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session if expired - required for Server Components
  const { data: { user } } = await supabase.auth.getUser()

  // Define protected routes
  const platformOwnerRoutes = ['/platform-owner']
  const protectedRoutes = [
    '/dashboard',
    '/project', 
    '/knowledge-base', 
    '/assessments', 
    '/team-members', 
    '/analytics', 
    '/settings'
  ]
  
  const needsPlatformOwner = platformOwnerRoutes.some(route => pathname.startsWith(route))
  const needsAuth = protectedRoutes.some(route => pathname.startsWith(route))
  const isPendingApproval = pathname === '/pending-approval'
  const isNoOrganization = pathname === '/no-organization'

  // Allow pending-approval and no-organization pages for authenticated users
  if ((isPendingApproval || isNoOrganization) && user) {
    return supabaseResponse
  }

  // Redirect to login if not authenticated and trying to access protected routes
  if (!user && (needsAuth || needsPlatformOwner)) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    return NextResponse.redirect(redirectUrl)
  }

  // If user is authenticated, check their role and status
  if (user && (needsAuth || needsPlatformOwner || pathname === '/login')) {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('org_id, role, status, email')
        .eq('id', user.id)
        .single()

      const platformOwnerEmail = process.env.PLATFORM_OWNER_EMAIL?.toLowerCase()
      const isPlatformOwner = platformOwnerEmail && user.email?.toLowerCase() === platformOwnerEmail

      // Platform owner trying to access platform-owner routes
      if (needsPlatformOwner) {
        if (!isPlatformOwner) {
          // Not platform owner - redirect to dashboard
          const redirectUrl = request.nextUrl.clone()
          redirectUrl.pathname = '/dashboard'
          return NextResponse.redirect(redirectUrl)
        }
        return supabaseResponse
      }

      // Platform owner trying to access regular routes - allow
      if (isPlatformOwner && pathname === '/login') {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/platform-owner'
        return NextResponse.redirect(redirectUrl)
      }

      // Regular user checks
      if (userData) {
        // Check if user is pending approval
        if (userData.status === 'pending' && !isPendingApproval) {
          const redirectUrl = request.nextUrl.clone()
          redirectUrl.pathname = '/pending-approval'
          return NextResponse.redirect(redirectUrl)
        }

        // Check if user is suspended
        if (userData.status === 'suspended') {
          await supabase.auth.signOut()
          const redirectUrl = request.nextUrl.clone()
          redirectUrl.pathname = '/login'
          redirectUrl.searchParams.set('error', 'account_suspended')
          return NextResponse.redirect(redirectUrl)
        }

        // Check if user has an organization (unless they're platform owner)
        if (!userData.org_id && userData.status === 'active' && !isPlatformOwner && !isNoOrganization) {
          const redirectUrl = request.nextUrl.clone()
          redirectUrl.pathname = '/no-organization'
          return NextResponse.redirect(redirectUrl)
        }

        // Redirect to dashboard if already logged in and trying to access login
        if (pathname === '/login' && userData.status === 'active') {
          const redirectUrl = request.nextUrl.clone()
          redirectUrl.pathname = '/dashboard'
          return NextResponse.redirect(redirectUrl)
        }
      } else {
        // User authenticated but no record in users table (shouldn't happen)
        // This would occur for a brand new OAuth user before callback processes them
        if (pathname !== '/login' && pathname !== '/auth/callback' && !isNoOrganization) {
          const redirectUrl = request.nextUrl.clone()
          redirectUrl.pathname = '/no-organization'
          return NextResponse.redirect(redirectUrl)
        }
      }
    } catch (error) {
      console.error('Error checking user role in middleware:', error)
    }
  }

  // Allow employee routes (they have their own auth checks)
  if (pathname.startsWith('/employee')) {
    // Only redirect /employee/login to main login
    if (pathname === '/employee/login') {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/login'
      return NextResponse.redirect(redirectUrl)
    }
    // All other employee routes are allowed
    return supabaseResponse
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
