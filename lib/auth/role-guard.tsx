"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"

type UserRole = "admin" | "employee"

interface RoleGuardProps {
  children: React.ReactNode
  allowedRoles: UserRole[]
  redirectTo?: string
  fallback?: React.ReactNode
}

/**
 * Senior-level Role Guard Component
 * - Handles authentication and authorization
 * - Provides clear loading states
 * - Redirects unauthorized users
 * - Type-safe role checking
 */
export function RoleGuard({ 
  children, 
  allowedRoles, 
  redirectTo,
  fallback 
}: RoleGuardProps) {
  const { user, profile, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Wait for auth to finish loading
    if (loading) {
      console.log("🔐 RoleGuard: Still loading auth...")
      return
    }

    // No user -> redirect to login
    if (!user) {
      console.log("🔐 RoleGuard: No user, redirecting to login")
      router.push("/login")
      return
    }

    // User exists but no profile yet -> wait (profile loads after user)
    if (!profile) {
      console.log("🔐 RoleGuard: User exists but profile not loaded yet, waiting...")
      return
    }

    // Check if user's role is allowed
    const userRole = profile.role as UserRole
    console.log("🔐 RoleGuard: Checking access", {
      userRole,
      allowedRoles,
      isAllowed: allowedRoles.includes(userRole),
      redirectTo
    })
    
    if (!allowedRoles.includes(userRole)) {
      // Redirect based on role
      console.log("🔐 RoleGuard: Access denied, redirecting...", {
        redirectTo: redirectTo || "smart redirect"
      })
      if (redirectTo) {
        router.push(redirectTo)
      } else {
        // Smart redirect: send to appropriate dashboard
        router.push(userRole === "admin" ? "/dashboard" : "/employee/dashboard")
      }
    } else {
      console.log("🔐 RoleGuard: ✅ Access granted!")
    }
  }, [user, profile, loading, allowedRoles, redirectTo, router])

  // Show loading state
  if (loading || !user || !profile) {
    return (
      fallback || (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-white/60">Loading...</div>
        </div>
      )
    )
  }

  // Check authorization
  const userRole = profile.role as UserRole
  if (!allowedRoles.includes(userRole)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-white/60">Redirecting...</div>
      </div>
    )
  }

  // Authorized - render children
  return <>{children}</>
}
