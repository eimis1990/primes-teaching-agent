-- ============================================
-- HYBRID RETRIEVAL (VECTOR + FTS + RRF FUSION)
-- Migration: 022_hybrid_retrieval_for_topic.sql
-- ============================================

-- Full-text index for lexical retrieval on chunk text
CREATE INDEX IF NOT EXISTS idx_document_embeddings_chunk_text_fts
  ON document_embeddings
  USING GIN (to_tsvector('english', COALESCE(chunk_text, '')));

-- Hybrid retrieval for topic-scoped tool queries.
-- Combines vector and full-text candidates with Reciprocal Rank Fusion (RRF).
CREATE OR REPLACE FUNCTION match_documents_hybrid_for_topic(
  query_embedding vector(768),
  query_text text,
  filter_org_id uuid,
  filter_topic_id uuid,
  vector_match_count int DEFAULT 50,
  fts_match_count int DEFAULT 50,
  final_match_count int DEFAULT 20,
  similarity_threshold float DEFAULT 0.45
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
  updated_at timestamptz,
  vector_rank int,
  fts_rank int,
  lexical_score float,
  rrf_score float
)
LANGUAGE sql
STABLE
AS $$
WITH vec_candidates AS (
  SELECT
    de.id,
    de.document_id,
    de.topic_id,
    de.chunk_text,
    de.chunk_index,
    1 - (de.embedding <=> query_embedding) AS similarity,
    de.metadata,
    de.section,
    de.updated_at,
    ROW_NUMBER() OVER (ORDER BY de.embedding <=> query_embedding ASC) AS vector_rank
  FROM document_embeddings de
  WHERE
    de.org_id = filter_org_id
    AND de.topic_id = filter_topic_id
    AND 1 - (de.embedding <=> query_embedding) >= similarity_threshold
  ORDER BY de.embedding <=> query_embedding ASC
  LIMIT vector_match_count
),
fts_candidates AS (
  SELECT
    de.id,
    ts_rank_cd(
      to_tsvector('english', COALESCE(de.chunk_text, '')),
      websearch_to_tsquery('english', query_text)
    ) AS lexical_score,
    ROW_NUMBER() OVER (
      ORDER BY
        ts_rank_cd(
          to_tsvector('english', COALESCE(de.chunk_text, '')),
          websearch_to_tsquery('english', query_text)
        ) DESC,
        de.updated_at DESC NULLS LAST
    ) AS fts_rank
  FROM document_embeddings de
  WHERE
    de.org_id = filter_org_id
    AND de.topic_id = filter_topic_id
    AND to_tsvector('english', COALESCE(de.chunk_text, '')) @@ websearch_to_tsquery('english', query_text)
  ORDER BY lexical_score DESC, de.updated_at DESC NULLS LAST
  LIMIT fts_match_count
),
fused AS (
  SELECT
    COALESCE(v.id, f.id) AS id,
    v.vector_rank,
    f.fts_rank,
    COALESCE(f.lexical_score, 0)::float AS lexical_score,
    (
      COALESCE(1.0 / (60 + v.vector_rank), 0.0) +
      COALESCE(1.0 / (60 + f.fts_rank), 0.0)
    )::float AS rrf_score
  FROM vec_candidates v
  FULL OUTER JOIN fts_candidates f ON f.id = v.id
)
SELECT
  de.id,
  de.document_id,
  de.topic_id,
  de.chunk_text,
  de.chunk_index,
  COALESCE(v.similarity, 1 - (de.embedding <=> query_embedding))::float AS similarity,
  de.metadata,
  de.section,
  de.updated_at,
  fu.vector_rank,
  fu.fts_rank,
  fu.lexical_score,
  fu.rrf_score
FROM fused fu
JOIN document_embeddings de ON de.id = fu.id
LEFT JOIN vec_candidates v ON v.id = fu.id
ORDER BY fu.rrf_score DESC, similarity DESC, fu.lexical_score DESC
LIMIT final_match_count;
$$;

GRANT EXECUTE ON FUNCTION match_documents_hybrid_for_topic(vector(768), text, uuid, uuid, int, int, int, float) TO authenticated;
GRANT EXECUTE ON FUNCTION match_documents_hybrid_for_topic(vector(768), text, uuid, uuid, int, int, int, float) TO service_role;
