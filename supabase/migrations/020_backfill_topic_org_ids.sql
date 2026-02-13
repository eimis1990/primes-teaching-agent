-- ============================================
-- BACKFILL ORG_ID FOR EXISTING TOPICS
-- Migration: 020_backfill_topic_org_ids.sql
-- Description: Update existing topics to have org_id from their creator's organization
-- ============================================

-- Backfill org_id for topics based on the user_id (topic creator)
-- This ensures all existing topics have the proper org_id set
UPDATE topics
SET org_id = users.org_id
FROM users
WHERE topics.user_id = users.id
  AND topics.org_id IS NULL
  AND users.org_id IS NOT NULL;

-- Log how many topics were updated
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Backfilled org_id for % topics', updated_count;
END $$;

-- Optional: Report any topics still missing org_id (these need manual intervention)
DO $$
DECLARE
  orphaned_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphaned_count
  FROM topics
  WHERE org_id IS NULL;
  
  IF orphaned_count > 0 THEN
    RAISE WARNING 'Found % topics without org_id. These topics belong to users without organizations and need manual review.', orphaned_count;
  ELSE
    RAISE NOTICE 'All topics have org_id set. Migration complete!';
  END IF;
END $$;
