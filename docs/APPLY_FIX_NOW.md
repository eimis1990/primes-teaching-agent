# 🔧 Fix Infinite Recursion Error - Instructions

## Problem
Your RLS policies on the `users` table are causing infinite recursion because they reference the same table in subqueries.

**Error:** `infinite recursion detected in policy for relation "users"`

## Solution
I've created a migration that fixes this by using `SECURITY DEFINER` functions that can access user data without triggering RLS policies.

## How to Apply the Fix

### Option 1: Supabase Dashboard (Recommended - 2 minutes)

1. **Go to your Supabase SQL Editor:**
   - Open: https://supabase.com/dashboard/project/bltbmfxcqxiwfbsjojlk/sql/new
   - Or navigate to: Project → SQL Editor → New Query

2. **Copy the migration SQL:**
   - Open the file: `supabase/migrations/015_fix_infinite_recursion.sql`
   - Select all and copy (Cmd/Ctrl + A, then Cmd/Ctrl + C)

3. **Paste and Run:**
   - Paste into the SQL Editor
   - Click "Run" or press Cmd/Ctrl + Enter

4. **Verify:**
   - You should see "Success. No rows returned"
   - Refresh your app in the browser
   - The error should be gone! ✅

### Option 2: Using psql (If you have it installed)

```bash
# Get your database connection string from Supabase Dashboard → Settings → Database
psql "your-connection-string" < supabase/migrations/015_fix_infinite_recursion.sql
```

## What the Migration Does

1. **Creates 3 helper functions:**
   - `auth.user_org_id()` - Gets the user's organization ID
   - `auth.user_is_admin()` - Checks if user is an admin
   - `auth.user_role()` - Gets the user's role

2. **Updates all RLS policies** to use these functions instead of subqueries

3. **Result:** No more infinite recursion! The policies now work correctly.

## After Applying

1. Hard refresh your browser (Cmd/Ctrl + Shift + R)
2. The 500 errors and infinite recursion messages should be gone
3. Your app should load correctly

## Need Help?

If you encounter any issues:
1. Check the Supabase Dashboard Logs for error messages
2. Make sure you're logged in with the right Supabase project
3. Verify the migration ran successfully (no error messages in SQL Editor)

---

**Created:** 2026-02-06
**Migration File:** `supabase/migrations/015_fix_infinite_recursion.sql`
