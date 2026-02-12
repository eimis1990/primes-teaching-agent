-- ============================================
-- SUPABASE RAG HARDENING + TOPIC TOOL SUPPORT
-- Migration: 019_supabase_rag_topic_tools.sql
-- ============================================

-- 1) Extend embeddings schema with richer retrieval metadata
ALTER TABLE document_embeddings
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS section TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS acl JSONB DEFAULT '{"scope":"org","roles":["admin","employee"]}'::jsonb;

-- Backfill org_id from documents for existing rows
UPDATE document_embeddings de
SET org_id = d.org_id
FROM documents d
WHERE de.document_id = d.id
  AND de.org_id IS NULL;

-- Backfill metadata fields for existing rows
UPDATE document_embeddings
SET section = 'chunk_' || (chunk_index + 1)::text
WHERE section IS NULL OR section = '';

UPDATE document_embeddings
SET updated_at = COALESCE(updated_at, created_at, now())
WHERE updated_at IS NULL;

UPDATE document_embeddings
SET acl = '{"scope":"org","roles":["admin","employee"]}'::jsonb
WHERE acl IS NULL;

CREATE INDEX IF NOT EXISTS idx_document_embeddings_org_topic
  ON document_embeddings(org_id, topic_id);

CREATE INDEX IF NOT EXISTS idx_document_embeddings_updated_at
  ON document_embeddings(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_document_embeddings_acl
  ON document_embeddings USING GIN(acl);

-- 2) Replace match_documents() so retrieval is org-scoped (not owner-only)
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(768),
  match_count int DEFAULT 10,
  filter_topic_ids uuid[] DEFAULT NULL,
  similarity_threshold float DEFAULT 0.5
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  topic_id uuid,
  chunk_text text,
  chunk_index integer,
  similarity float,
  metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    de.id,
    de.document_id,
    de.topic_id,
    de.chunk_text,
    de.chunk_index,
    1 - (de.embedding <=> query_embedding) AS similarity,
    de.metadata
  FROM document_embeddings de
  WHERE
    (filter_topic_ids IS NULL OR de.topic_id = ANY(filter_topic_ids))
    AND 1 - (de.embedding <=> query_embedding) >= similarity_threshold
    AND (
      (de.org_id IS NOT NULL AND de.org_id = public.get_user_org_id())
      OR (
        de.org_id IS NULL
        AND de.user_id IN (
          SELECT id
          FROM users
          WHERE org_id = public.get_user_org_id()
        )
      )
    )
    AND COALESCE(de.acl->>'scope', 'org') = 'org'
    AND (
      NOT (de.acl ? 'roles')
      OR jsonb_typeof(de.acl->'roles') <> 'array'
      OR public.get_user_role() IN (
        SELECT jsonb_array_elements_text(de.acl->'roles')
      )
    )
  ORDER BY de.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 3) Service-side function for ElevenLabs tool calls (explicit org + topic filters)
CREATE OR REPLACE FUNCTION match_documents_for_topic(
  query_embedding vector(768),
  filter_org_id uuid,
  filter_topic_id uuid,
  match_count int DEFAULT 6,
  similarity_threshold float DEFAULT 0.5
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  topic_id uuid,
  chunk_text text,
  chunk_index integer,
  similarity float,
  metadata jsonb,
  section text,
  updated_at timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    de.id,
    de.document_id,
    de.topic_id,
    de.chunk_text,
    de.chunk_index,
    1 - (de.embedding <=> query_embedding) AS similarity,
    de.metadata,
    de.section,
    de.updated_at
  FROM document_embeddings de
  WHERE
    de.org_id = filter_org_id
    AND de.topic_id = filter_topic_id
    AND 1 - (de.embedding <=> query_embedding) >= similarity_threshold
  ORDER BY de.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION match_documents(vector(768), int, uuid[], float) TO authenticated;
GRANT EXECUTE ON FUNCTION match_documents_for_topic(vector(768), uuid, uuid, int, float) TO authenticated;
GRANT EXECUTE ON FUNCTION match_documents_for_topic(vector(768), uuid, uuid, int, float) TO service_role;
