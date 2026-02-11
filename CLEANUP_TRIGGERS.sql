-- Run this SQL to clean up any problematic triggers
-- This will remove any existing triggers that might be interfering with auth

-- Drop the trigger on auth.users if it exists
DO $$ 
BEGIN
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  RAISE NOTICE 'Trigger on_auth_user_created dropped (if it existed)';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not drop trigger (might not exist or no permissions)';
END $$;

-- Also drop the function if you want to completely remove it
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- Check if there are any other triggers on auth.users
SELECT 
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users';

-- This should return empty if all triggers are removed
