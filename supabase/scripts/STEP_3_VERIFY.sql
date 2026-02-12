-- ============================================
-- STEP 3: Verify Setup (Run AFTER migration)
-- ============================================
-- This checks that everything was set up correctly

-- Check enum types
DO $$
BEGIN
  RAISE NOTICE '=== Checking Enum Types ===';
  
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    RAISE NOTICE '✅ user_role enum exists';
  ELSE
    RAISE NOTICE '❌ user_role enum missing - RE-RUN MIGRATION!';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
    RAISE NOTICE '✅ user_status enum exists';
  ELSE
    RAISE NOTICE '❌ user_status enum missing - RE-RUN MIGRATION!';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invite_status') THEN
    RAISE NOTICE '✅ invite_status enum exists';
  ELSE
    RAISE NOTICE '❌ invite_status enum missing - RE-RUN MIGRATION!';
  END IF;
END $$;

-- Check tables
DO $$
BEGIN
  RAISE NOTICE '=== Checking Tables ===';
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organizations') THEN
    RAISE NOTICE '✅ organizations table exists';
  ELSE
    RAISE NOTICE '❌ organizations table missing - RE-RUN MIGRATION!';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    RAISE NOTICE '✅ users table exists';
  ELSE
    RAISE NOTICE '❌ users table missing - RE-RUN MIGRATION!';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invites') THEN
    RAISE NOTICE '✅ invites table exists';
  ELSE
    RAISE NOTICE '❌ invites table missing - RE-RUN MIGRATION!';
  END IF;
END $$;

-- Check users table structure
SELECT column_name, data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'users'
ORDER BY ordinal_position;

-- Final check: Make sure no triggers on auth.users
SELECT 
  trigger_name,
  event_object_table
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users';

-- If the query above returns empty, that's perfect! ✅

-- Summary message
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ Verification complete!';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Restart your dev server: npm run dev';
  RAISE NOTICE '2. Clear browser cache/cookies';
  RAISE NOTICE '3. Go to http://localhost:3000/login';
  RAISE NOTICE '4. Click "Continue with Google"';
  RAISE NOTICE '5. Sign in with: e.kudarauskas@gmail.com';
  RAISE NOTICE '';
  RAISE NOTICE 'You should be redirected to /platform-owner';
  RAISE NOTICE '============================================';
END $$;
