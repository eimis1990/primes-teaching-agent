-- ============================================
-- COMPLETE FIX - Run this entire script
-- ============================================

-- Step 1: Fix RLS policies (allow users to see their own profile)
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can view users in their organization" ON users;

CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can view users in their organization"
  ON users FOR SELECT
  USING (
    org_id IS NOT NULL 
    AND org_id IN (SELECT org_id FROM users WHERE users.id = auth.uid() AND org_id IS NOT NULL)
  );

-- Step 2: Check if your user exists in public.users
DO $$
DECLARE
  user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count
  FROM users
  WHERE email = 'e.kudarauskas@gmail.com';
  
  IF user_count = 0 THEN
    RAISE NOTICE '❌ User not found in public.users table!';
    RAISE NOTICE 'This means the auth callback did not create your user record.';
    RAISE NOTICE 'Check your terminal logs for errors from the auth callback.';
  ELSE
    RAISE NOTICE '✅ User exists in public.users table!';
  END IF;
END $$;

-- Step 3: Display current users in the table
SELECT id, email, role, org_id, status, created_at
FROM users
ORDER BY created_at DESC;

-- If your email is NOT in the list above, the auth callback failed to create you.
-- Check your Next.js terminal for error logs from /app/auth/callback/route.ts

DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'If user not found, try signing in again to trigger auth callback.';
  RAISE NOTICE 'Watch your terminal for logs starting with: === AUTH CALLBACK DEBUG ===';
  RAISE NOTICE '============================================';
END $$;
