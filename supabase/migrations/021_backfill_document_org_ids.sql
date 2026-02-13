-- ============================================
-- BACKFILL ORG_ID FOR EXISTING DOCUMENTS
-- Migration: 021_backfill_document_org_ids.sql
-- Description: Update existing documents to have org_id from their topic's organization
-- ============================================

-- Backfill org_id for documents based on their topic's org_id
-- First priority: Use topic's org_id
UPDATE documents
SET org_id = topics.org_id
FROM topics
WHERE documents.topic_id = topics.id
  AND documents.org_id IS NULL
  AND topics.org_id IS NOT NULL;

-- Log how many documents were updated via topics
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Backfilled org_id for % documents from their topics', updated_count;
END $$;

-- Fallback: If topic doesn't have org_id, use the document creator's org_id
UPDATE documents
SET org_id = users.org_id
FROM users
WHERE documents.user_id = users.id
  AND documents.org_id IS NULL
  AND users.org_id IS NOT NULL;

-- Log how many documents were updated via users
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Backfilled org_id for % documents from their creators', updated_count;
END $$;

-- Optional: Report any documents still missing org_id
DO $$
DECLARE
  orphaned_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphaned_count
  FROM documents
  WHERE org_id IS NULL;
  
  IF orphaned_count > 0 THEN
    RAISE WARNING 'Found % documents without org_id. These need manual review.', orphaned_count;
  ELSE
    RAISE NOTICE 'All documents have org_id set. Migration complete!';
  END IF;
END $$;
