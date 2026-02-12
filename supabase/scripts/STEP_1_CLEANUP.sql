-- ============================================
-- STEP 1: Clean Up Triggers (Run this FIRST)
-- ============================================
-- This removes any problematic triggers on auth.users

DO $$ 
BEGIN
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
  RAISE NOTICE '✅ Cleanup complete!';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '✅ Nothing to clean up (this is fine)';
END $$;

-- Verify no triggers exist (should return empty)
SELECT 
  trigger_name,
  event_object_table
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users';

-- If the query above returns: "Query returned successfully with no result"
-- That means SUCCESS - no triggers exist! ✅
-- 
-- Next step: Run the migration (014_multi_tenant_platform.sql)
