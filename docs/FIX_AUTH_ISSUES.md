# Fix Auth Issues - Step by Step

## Problem
Getting "Database error saving new user" when trying to sign in with Google OAuth.

This is caused by database triggers on `auth.users` table interfering with Supabase Auth.

## Solution

### Step 1: Clean Up Triggers

Run this SQL in Supabase SQL Editor:

```sql
-- Drop the problematic trigger
DO $$ 
BEGIN
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  RAISE NOTICE 'Trigger dropped successfully';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Trigger does not exist or no permissions';
END $$;

-- Drop the function
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- Verify no triggers exist on auth.users
SELECT 
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users';

-- Should return empty!
```

### Step 2: Re-run the Migration

Run the updated `014_multi_tenant_platform.sql` file (the trigger section is now commented out).

### Step 3: Test Sign In

1. **Restart your dev server:**
   ```bash
   npm run dev
   ```

2. **Clear browser data:**
   - Open DevTools (F12)
   - Application tab → Clear storage
   - Or use Incognito window

3. **Try signing in:**
   - Go to `http://localhost:3000/login`
   - Click "Continue with Google"
   - Sign in with `e.kudarauskas@gmail.com`

### Step 4: Verify User Creation

After successful sign-in, check the database:

```sql
-- Check if your user was created in public.users
SELECT id, email, role, org_id, status, created_at
FROM users
WHERE email = 'e.kudarauskas@gmail.com';

-- Should show your user record!
```

## How It Works Now

1. **Google OAuth** → Supabase creates user in `auth.users`
2. **Auth Callback** (`/app/auth/callback/route.ts`) → Creates user in `public.users` with proper role
3. **Middleware** → Checks role and redirects accordingly
4. **No database triggers** → Everything handled in application code

## Why This Works Better

- ✅ No trigger conflicts with Supabase Auth
- ✅ Better error handling in application code
- ✅ Easier to debug
- ✅ More control over user creation logic
- ✅ Can handle complex invite/domain matching logic

## Troubleshooting

If you still get errors:

1. Check browser console for detailed errors
2. Check Supabase logs (Dashboard → Logs)
3. Verify `.env.local` has both:
   - `PLATFORM_OWNER_EMAIL`
   - `NEXT_PUBLIC_PLATFORM_OWNER_EMAIL`
4. Make sure service role key is set correctly
