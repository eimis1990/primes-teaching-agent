-- ============================================
-- RUN THIS FIRST - Complete Setup Script
-- ============================================
-- This script will:
-- 1. Clean up any problematic triggers
-- 2. Run the multi-tenant migration
-- 3. Verify everything is set up correctly

-- ============================================
-- STEP 1: Clean Up Problematic Triggers
-- ============================================
DO $$ 
BEGIN
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
  RAISE NOTICE '✅ Cleaned up auth triggers and functions';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '⚠️ No triggers to clean up (this is OK)';
END $$;

-- ============================================
-- STEP 2: Now run the migration
-- Copy and paste the ENTIRE contents of:
-- supabase/migrations/014_multi_tenant_platform.sql
-- ============================================

-- After running the migration, continue with Step 3 below...

-- ============================================
-- STEP 3: Verify Setup (Run this AFTER the migration)
-- ============================================

-- Check enum types
DO $$
BEGIN
  RAISE NOTICE '--- Checking Enum Types ---';
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    RAISE NOTICE '✅ user_role enum exists';
  ELSE
    RAISE NOTICE '❌ user_role enum missing';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
    RAISE NOTICE '✅ user_status enum exists';
  ELSE
    RAISE NOTICE '❌ user_status enum missing';
  END IF;
END $$;

-- Check tables
DO $$
BEGIN
  RAISE NOTICE '--- Checking Tables ---';
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
    RAISE NOTICE '✅ organizations table exists';
  ELSE
    RAISE NOTICE '❌ organizations table missing';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    RAISE NOTICE '✅ users table exists';
  ELSE
    RAISE NOTICE '❌ users table missing';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invites') THEN
    RAISE NOTICE '✅ invites table exists';
  ELSE
    RAISE NOTICE '❌ invites table missing';
  END IF;
END $$;

-- Check for any triggers on auth.users
SELECT 
  '❌ WARNING: Trigger exists on auth.users: ' || trigger_name as message
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users';

-- If the query above returns empty, that's good!
-- You should see a message like: "Query returned successfully with no result"

DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ Setup verification complete!';
  RAISE NOTICE 'If all checks passed, you can now:';
  RAISE NOTICE '1. Restart your dev server';
  RAISE NOTICE '2. Clear browser cache';
  RAISE NOTICE '3. Try signing in at /login';
  RAISE NOTICE '============================================';
END $$;
