# Multi-Tenant Platform Migration Guide

## Overview

This migration transforms the application from a simple admin/employee system to a full multi-tenant SaaS platform with three user levels:

1. **Platform Owner** - You (identified by email in `.env.local`)
2. **Organization Admins** - Create assessments and manage their organization
3. **Employees** - Take assessments

## Database Changes

### New Tables

#### `organizations`
```sql
- id: UUID
- name: TEXT
- slug: TEXT (unique)
- allowed_domains: TEXT[] (for auto-approval)
- settings: JSONB
- is_active: BOOLEAN
- created_at, updated_at: TIMESTAMPTZ
```

#### `invites`
```sql
- id: UUID
- org_id: UUID → organizations
- email: TEXT
- role: user_role ('admin' | 'employee')
- invited_by: UUID → users
- status: invite_status ('pending' | 'accepted' | 'expired' | 'cancelled')
- expires_at: TIMESTAMPTZ
- accepted_at: TIMESTAMPTZ
- created_at: TIMESTAMPTZ
```

### Modified Tables

#### `users` (extended)
**New columns added:**
- `org_id`: UUID → organizations
- `role`: user_role ('admin' | 'employee')
- `status`: user_status ('active' | 'pending' | 'suspended')
- `position`: TEXT (optional)
- `is_active`: BOOLEAN
- `last_login_at`: TIMESTAMPTZ
- `created_at`, `updated_at`: TIMESTAMPTZ

#### All data tables
**New column added to:**
- `topics`
- `documents`
- `conversations`
- `question_banks`
- `assessment_types`
- `assessments`
- `question_library`

**Added:** `org_id` UUID → organizations

### Removed Tables
- `employees` - All users now in unified `users` table via Supabase Auth

## Authentication Flow Changes

### Before (Old System)
- **Admins**: Google OAuth → `users` table
- **Employees**: Email/Password → `employees` table with custom JWT

### After (New System)
- **Everyone**: Google OAuth → `users` table with role-based access

### New Sign-In Flow

1. User clicks "Continue with Google"
2. Google OAuth completes
3. System checks:
   ```
   IF email === PLATFORM_OWNER_EMAIL:
     → Show Platform Owner Panel
   
   ELSE IF user exists in users table:
     → Redirect based on role:
        - admin → /dashboard (admin view)
        - employee → /dashboard (employee view)
   
   ELSE IF invite exists for email:
     → Create user with invited role + org_id
     → Mark invite as 'accepted'
     → Redirect to dashboard
   
   ELSE IF email domain matches org's allowed_domains:
     → Create user as 'pending' with that org_id
     → Show "Waiting for admin approval" message
   
   ELSE:
     → Show "You don't belong to any organization" message
   ```

## Migration Steps

### 1. Update .env.local

```bash
# Add your platform owner email
PLATFORM_OWNER_EMAIL=your-email@example.com
```

### 2. Run the Migration

```bash
# Connect to your Supabase project
npx supabase db push

# Or run the migration file directly in Supabase Dashboard
# SQL Editor → Run: supabase/migrations/014_multi_tenant_platform.sql
```

### 3. Verify Migration

Check that:
- ✅ `organizations` table exists
- ✅ `invites` table exists
- ✅ `employees` table is dropped
- ✅ `users` table has new columns
- ✅ All data tables have `org_id` column

## Code Changes Required

### 1. Remove Employee Auth System

**Files to delete:**
- `/lib/auth/employee-auth.ts` - JWT generation, password hashing
- `/contexts/employee-auth-context.tsx` - Employee auth context
- `/app/api/assessments/employee/auth/route.ts` - Employee login API
- `/app/api/assessments/employee/session/route.ts` - Session verification API
- `/app/api/auth/employee-session/route.ts` - Employee session API

### 2. Update Authentication

**Update these files:**

#### `/app/login/page.tsx`
- Remove tabbed interface
- Single "Continue with Google" button
- Use shadcn `Button` component

#### `/app/auth/callback/route.ts`
- Remove `auth_role` cookie logic
- Implement new sign-in flow (check invite, domain, etc.)
- Handle Platform Owner detection
- Redirect based on user role

#### `/middleware.ts`
- Remove employee JWT validation
- Use unified Supabase Auth for all users
- Check user role for route access
- Redirect Platform Owner to `/platform-owner`

### 3. Update API Routes

**Replace employee queries with user queries:**

#### `/app/api/employees/route.ts`
```typescript
// OLD
from('employees').select('*').eq('created_by', user.id)

// NEW
from('users')
  .select('*')
  .eq('org_id', userOrgId)
  .eq('role', 'employee')
```

#### All assessment APIs
```typescript
// Add org_id to all queries
.eq('org_id', userOrgId)
```

### 4. Update Database Queries

**Pattern to follow:**

```typescript
// Before
const { data } = await supabase
  .from('assessments')
  .select('*')
  .eq('user_id', userId);

// After
const { data } = await supabase
  .from('assessments')
  .select('*')
  .eq('org_id', userOrgId);
```

### 5. Create New Pages

#### `/app/platform-owner/page.tsx`
Platform Owner dashboard with:
- Create organization
- View all organizations
- Assign org admins
- Manage allowed domains

#### `/app/dashboard/page.tsx` (Update)
Unified dashboard that shows:
- Admin UI if `user.role === 'admin'`
- Employee UI if `user.role === 'employee'`

### 6. Update Context Providers

#### `/contexts/auth-context.tsx`
```typescript
interface User {
  id: string;
  email: string;
  role: 'admin' | 'employee';
  org_id: string | null;
  status: 'active' | 'pending' | 'suspended';
  // ... other fields
}
```

### 7. Create Invite System

#### `/app/api/invites/route.ts`
```typescript
POST   - Create invite (admin only)
GET    - List invites for org
PUT    - Update invite status
DELETE - Cancel invite
```

#### `/components/team/invite-dialog.tsx`
- Form to invite users by email
- Select role (admin/employee)
- Shows pending invites

## New Features to Build

### Platform Owner Panel
- **Organizations Management**
  - Create/edit/delete organizations
  - Set organization slug
  - Configure allowed domains
  - View organization stats

- **Admin Assignment**
  - Assign users as org admins
  - Remove admin access

### Admin Panel (per organization)
- **Team Management**
  - Invite employees by email
  - Approve pending users (from allowed domains)
  - Set user roles
  - Suspend users

- **Organization Settings**
  - Edit org name
  - Update allowed domains
  - View organization usage

### Employee Experience
- **Pending State**
  - "Waiting for approval" screen
  - Contact admin button

- **No Organization**
  - "You don't belong to any organization" message
  - Request access form

## Testing Checklist

### Platform Owner
- [ ] Sign in with PLATFORM_OWNER_EMAIL
- [ ] Create a new organization
- [ ] Assign an admin to the organization
- [ ] Set allowed domains

### Organization Admin
- [ ] Sign in as org admin
- [ ] Invite employee by email
- [ ] Create assessment
- [ ] View employees in organization only

### Employee
- [ ] Sign in with invite link
- [ ] See assessments assigned to them
- [ ] Cannot see other organization's data

### Security
- [ ] Users can only see their organization's data
- [ ] Platform Owner can see all organizations
- [ ] Admins cannot access other organizations
- [ ] Employees cannot access admin features

## RLS Policies Summary

All tables now enforce organization-level isolation:

```sql
-- Users can only see data from their organization
WHERE org_id IN (
  SELECT org_id FROM users WHERE users.id = auth.uid()
)

-- Admins can modify data in their organization
WHERE org_id IN (
  SELECT org_id FROM users 
  WHERE users.id = auth.uid() AND users.role = 'admin'
)
```

## Rollback Plan

If you need to rollback:

1. Keep the `employees` table backup
2. Restore from previous migration
3. Run: `supabase db reset`

## Notes

- All password authentication code is removed
- Custom JWT tokens are no longer used
- All users authenticate via Supabase Auth (Google OAuth)
- RLS policies enforce multi-tenant data isolation
- The `handle_new_user()` trigger automates user onboarding

## Next Steps After Migration

1. Update all frontend components to use new auth flow
2. Build Platform Owner UI
3. Build Invite system UI
4. Update team management UI
5. Add organization settings page
6. Test thoroughly with multiple organizations
7. Deploy!
