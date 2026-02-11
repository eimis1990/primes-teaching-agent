# Role-Based Authentication & Authorization Guide

## 🏗️ Architecture Overview

This application implements a **production-ready, role-based access control (RBAC)** system with a clean separation of concerns and type-safe implementation.

### Key Principles

1. **Single Source of Truth** - Auth context provides user & profile data
2. **Declarative Access Control** - Use `RoleGuard` component for route protection
3. **Type Safety** - TypeScript types for roles, users, and profiles
4. **DRY (Don't Repeat Yourself)** - Centralized role checking logic
5. **Clear Loading States** - Proper handling of async auth states

---

## 📁 File Structure

```
lib/auth/
├── role-guard.tsx       # Role-based route protection component
└── types.ts             # TypeScript types for auth

contexts/
└── auth-context.tsx     # Main auth context provider

app/
├── employee/            # Employee-only routes (protected by RoleGuard)
│   ├── assessments/
│   ├── dashboard/
│   └── chatbot/
└── (admin routes)       # Admin routes (implicitly protected)
```

---

## 🔐 Core Components

### 1. RoleGuard Component

**Location:** `lib/auth/role-guard.tsx`

The `RoleGuard` is a Higher-Order Component (HOC) that wraps pages to enforce role-based access control.

#### Features:
- ✅ Checks authentication status
- ✅ Verifies user role against allowed roles
- ✅ Automatic redirects for unauthorized users
- ✅ Proper loading states
- ✅ Smart fallback behavior

#### Usage:

```typescript
import { RoleGuard } from "@/lib/auth/role-guard"

export default function EmployeePage() {
  return (
    <RoleGuard allowedRoles={["employee"]} redirectTo="/assessments">
      <div>
        {/* Page content - only accessible to employees */}
      </div>
    </RoleGuard>
  )
}
```

#### Props:

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `children` | ReactNode | ✅ | Content to render if authorized |
| `allowedRoles` | UserRole[] | ✅ | Array of roles that can access this page |
| `redirectTo` | string | ❌ | Custom redirect path (defaults to role-based redirect) |
| `fallback` | ReactNode | ❌ | Custom loading component |

#### Smart Redirects:

If `redirectTo` is not provided, users are automatically redirected based on their role:
- **Admins** → `/dashboard`
- **Employees** → `/employee/dashboard`

---

### 2. Type System

**Location:** `lib/auth/types.ts`

Type-safe definitions for authentication and authorization.

```typescript
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
```

---

## 🎯 Implementation Patterns

### Pattern 1: Protected Employee Page

```typescript
"use client"

import { RoleGuard } from "@/lib/auth/role-guard"
import { Sidebar } from "@/components/sidebar"

function EmployeeContentPage() {
  // Page logic here - no auth checks needed!
  return <div>Employee-specific content</div>
}

export default function EmployeePage() {
  return (
    <RoleGuard allowedRoles={["employee"]} redirectTo="/assessments">
      <div className="min-h-screen bg-background flex">
        <Sidebar />
        <EmployeeContentPage />
      </div>
    </RoleGuard>
  )
}
```

### Pattern 2: Role-Specific API Routes

**Backend:** `app/api/assessments/route.ts`

```typescript
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Fetch user role
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single()

  // Role-based filtering
  let query = supabase
    .from("assessments")
    .select(`*,employee:users!assessments_employee_id_fkey(...)`)

  if (userData?.role === "admin") {
    query = query.eq("user_id", user.id) // Admin sees their created assessments
  } else {
    query = query.eq("employee_id", user.id) // Employee sees assigned assessments
  }

  const { data, error } = await query
  return NextResponse.json({ data })
}
```

### Pattern 3: Conditional UI Rendering

```typescript
import { useAuth } from "@/contexts/auth-context"

export function MyComponent() {
  const { profile } = useAuth()
  
  return (
    <div>
      {profile?.role === "admin" && (
        <button>Admin-only action</button>
      )}
      
      {profile?.role === "employee" && (
        <p>Employee message</p>
      )}
    </div>
  )
}
```

---

## 🛣️ Routing Strategy

### Employee Routes: `/employee/*`

All employee-specific pages are under the `/employee/` directory:

- `/employee/dashboard` - Employee dashboard
- `/employee/assessments` - List of assigned assessments
- `/employee/assessment/[id]` - Take an assessment
- `/employee/assessment/[id]/results` - View results
- `/employee/chatbot` - AI chatbot interface

**All wrapped with:** `<RoleGuard allowedRoles={["employee"]}>`

### Admin Routes: `/` (root)

Admin pages are at the root level:

- `/dashboard` - Admin dashboard
- `/assessments` - Manage all assessments
- `/assessments/[id]` - Assessment details (admin view)
- `/employees` - Manage employees
- `/chat` - Admin chat interface

**Protection:** Implicit via sidebar routing + API-level checks

---

## 🔄 Auth Flow

```
1. User loads page
   ↓
2. RoleGuard checks auth.loading
   ↓ (if loading)
   → Show loading state
   ↓ (if loaded)
3. Check if user exists
   ↓ (no user)
   → Redirect to /login
   ↓ (has user)
4. Wait for profile to load
   ↓ (no profile yet)
   → Show loading state
   ↓ (has profile)
5. Check profile.role against allowedRoles
   ↓ (not allowed)
   → Redirect to appropriate dashboard
   ↓ (allowed)
6. Render children
```

---

## 🎨 Benefits of This Approach

### ✅ Developer Experience

1. **No repetitive auth checks** - Just wrap with `RoleGuard`
2. **Type safety** - TypeScript catches role typos
3. **Clear intent** - `allowedRoles` prop makes permissions obvious
4. **Testable** - Easy to mock `RoleGuard` in tests

### ✅ User Experience

1. **Fast redirects** - No page flash before redirect
2. **Proper loading states** - Users never see unauthorized content
3. **Smart routing** - Automatic role-based redirects

### ✅ Security

1. **Client-side protection** - Prevents UI rendering of unauthorized content
2. **API-level validation** - Backend always validates roles
3. **No authorization bypass** - All routes explicitly protected

---

## 📝 Common Patterns

### Adding a New Employee Page

1. Create file in `app/employee/new-page/page.tsx`
2. Wrap with `RoleGuard`:

```typescript
import { RoleGuard } from "@/lib/auth/role-guard"

export default function NewEmployeePage() {
  return (
    <RoleGuard allowedRoles={["employee"]}>
      {/* Your content */}
    </RoleGuard>
  )
}
```

### Adding a New Role

1. Update `lib/auth/types.ts`:

```typescript
export type UserRole = "admin" | "employee" | "manager" // Add new role
```

2. Update database enum (migration)
3. Use in `RoleGuard`:

```typescript
<RoleGuard allowedRoles={["admin", "manager"]}>
  {/* Content */}
</RoleGuard>
```

### Multiple Allowed Roles

```typescript
<RoleGuard allowedRoles={["admin", "manager", "supervisor"]}>
  {/* Content accessible to admins, managers, and supervisors */}
</RoleGuard>
```

---

## 🚀 Best Practices

### DO ✅

- Use `RoleGuard` for ALL protected pages
- Check roles on BOTH frontend and backend
- Use TypeScript types for type safety
- Handle loading states properly
- Provide fallback UI for unauthorized users

### DON'T ❌

- Check `user` or `profile` in every component
- Rely only on client-side role checks for security
- Hardcode role strings - use the `UserRole` type
- Skip loading states
- Expose sensitive data in frontend before role check

---

## 🐛 Troubleshooting

### Issue: "Still seeing loading state"

**Cause:** Profile hasn't loaded yet

**Fix:** Ensure `AuthProvider` is properly fetching profile:

```typescript
// In auth-context.tsx
useEffect(() => {
  if (user) {
    fetchProfile(user.id)
  }
}, [user])
```

### Issue: "Unauthorized users can access page briefly"

**Cause:** Race condition between page render and role check

**Fix:** Ensure `RoleGuard` shows loading state while checking:

```typescript
if (loading || !user || !profile) {
  return <LoadingState />
}
```

### Issue: "Redirecting in a loop"

**Cause:** Redirect target is also protected by incompatible `RoleGuard`

**Fix:** Ensure redirect targets are accessible:

```typescript
// Bad: redirecting employee to admin dashboard
<RoleGuard allowedRoles={["employee"]} redirectTo="/dashboard">

// Good: redirect to employee dashboard
<RoleGuard allowedRoles={["employee"]} redirectTo="/employee/dashboard">
```

---

## 📚 Related Documentation

- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Next.js Authentication](https://nextjs.org/docs/authentication)
- [Row Level Security (RLS) Setup](./ADMIN_MANAGEMENT_GUIDE.md)

---

**Last Updated:** Feb 2026
**Maintainer:** Development Team
