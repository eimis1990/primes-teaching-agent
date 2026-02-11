-- Run this SQL in Supabase SQL Editor to check your database state
-- This will tell us which tables exist and what we need to create

SELECT 
  'Tables that exist:' as info,
  table_name
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
