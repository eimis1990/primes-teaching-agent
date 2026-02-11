/**
 * Type-safe authentication and authorization types
 */

export type UserRole = "admin" | "employee"

export type UserStatus = "active" | "inactive" | "pending"

export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  position: string | null
  role: UserRole
  org_id: string | null
  status: UserStatus
  created_at: string
  updated_at: string
}

export interface AuthUser {
  id: string
  email: string
}

export interface AuthContext {
  user: AuthUser | null
  profile: UserProfile | null
  loading: boolean
  signOut: () => Promise<void>
}
