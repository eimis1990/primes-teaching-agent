-- Check if your user exists in the database

-- 1. Check auth.users (Supabase Auth) - you should exist here
SELECT id, email, created_at
FROM auth.users
WHERE email = 'e.kudarauskas@gmail.com';

-- 2. Check public.users (profile table) - this is where the error is
SELECT id, email, role, org_id, status, created_at
FROM users
WHERE email = 'e.kudarauskas@gmail.com';

-- If the second query returns empty, your profile wasn't created!
-- This means the auth callback failed to insert the user

-- 3. Check RLS policies on INSERT for users table
SELECT 
  policyname,
  cmd,
  with_check
FROM pg_policies
WHERE tablename = 'users'
  AND cmd = 'INSERT';

-- If this returns empty, that's the problem - no INSERT policy exists!
