-- Migrate from OpenAI embeddings (1536 dimensions) to Gemini embeddings (768 dimensions)

-- Step 1: Drop the existing vector similarity index
DROP INDEX IF EXISTS document_embeddings_embedding_idx;

-- Step 2: Update the embedding column to use 768 dimensions (Gemini text-embedding-004)
ALTER TABLE document_embeddings 
ALTER COLUMN embedding TYPE vector(768);

-- Step 3: Recreate the vector similarity search index with new dimensions
CREATE INDEX document_embeddings_embedding_idx 
ON document_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Step 4: Update the match_documents function to work with 768 dimensions
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(768),  -- Changed from 1536 to 768
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
    document_embeddings.id,
    document_embeddings.document_id,
    document_embeddings.topic_id,
    document_embeddings.chunk_text,
    document_embeddings.chunk_index,
    1 - (document_embeddings.embedding <=> query_embedding) AS similarity,
    document_embeddings.metadata
  FROM document_embeddings
  WHERE 
    (filter_topic_ids IS NULL OR document_embeddings.topic_id = ANY(filter_topic_ids))
    AND document_embeddings.user_id = auth.uid()
    AND 1 - (document_embeddings.embedding <=> query_embedding) >= similarity_threshold
  ORDER BY document_embeddings.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Note: All existing embeddings will need to be regenerated after this migration
-- Run the reprocessEmbeddings function for each topic in your app
-- The new embeddings will be generated using Gemini's text-embedding-004 model
