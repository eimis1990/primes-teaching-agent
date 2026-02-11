-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create embeddings table
CREATE TABLE document_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  embedding vector(1536), -- OpenAI text-embedding-3-small dimensions
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create vector similarity search index
CREATE INDEX ON document_embeddings USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create metadata index for filtering
CREATE INDEX ON document_embeddings USING GIN (metadata);
CREATE INDEX ON document_embeddings (topic_id);
CREATE INDEX ON document_embeddings (user_id);
CREATE INDEX ON document_embeddings (document_id);

-- RLS Policies
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own embeddings"
  ON document_embeddings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own embeddings"
  ON document_embeddings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own embeddings"
  ON document_embeddings FOR DELETE
  USING (auth.uid() = user_id);

-- Create vector similarity search function
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(1536),
  match_count int DEFAULT 10,
  filter_topic_ids uuid[] DEFAULT NULL,
  similarity_threshold float DEFAULT 0.7
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
