# Step 4: Fix RLS Policies

## Issue

You successfully logged in but got these errors:
- "Error fetching profile"
- "Error loading projects"

## Root Cause

The RLS (Row Level Security) policy on the `users` table was blocking users from viewing their own profile.

## Fix

Run this SQL in Supabase SQL Editor:

```sql
-- Drop old policy
DROP POLICY IF EXISTS "Users can view users in their organization" ON users;

-- Create TWO policies for SELECT:

-- 1. Users can always view their own profile (CRITICAL!)
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

-- 2. Users can view other users in their organization
CREATE POLICY "Users can view users in their organization"
  ON users FOR SELECT
  USING (
    org_id IS NOT NULL 
    AND org_id IN (SELECT org_id FROM users WHERE users.id = auth.uid() AND org_id IS NOT NULL)
  );
```

## Code Changes Made

I've already updated:
- ✅ `contexts/auth-context.tsx` - Better error logging
- ✅ `contexts/project-context.tsx` - Only load projects if user has org_id
- ✅ `supabase/migrations/014_multi_tenant_platform.sql` - Fixed RLS policies in migration

## After Running the Fix

1. **Run the SQL above** in Supabase SQL Editor
2. **Refresh your browser** (just F5, no need to clear cache)
3. **Check the page** - errors should be gone!

## What You Should See

After the fix:
- ✅ No console errors
- ✅ Platform owner panel loads correctly
- ✅ User profile loads successfully
- ✅ No "Error loading projects" (platform owners don't have projects)

## Why This Happened

The original RLS policy was:
```sql
CREATE POLICY "Users can view users in their organization"
  ON users FOR SELECT
  USING (org_id IN (SELECT org_id FROM users WHERE users.id = auth.uid()));
```

Problem: This tries to match `org_id = org_id`, but for platform owners `org_id` is `NULL`, and `NULL = NULL` is not true in SQL!

Solution: Add a separate policy that allows users to always view their own profile, regardless of org_id.

## Next Steps

After this fix:
1. ✅ You can use the platform owner panel
2. ✅ Create your first organization
3. ✅ Invite admins
4. ✅ Test the full flow!
