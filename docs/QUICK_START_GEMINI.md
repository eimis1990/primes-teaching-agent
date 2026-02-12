# ⚡ Quick Start: Gemini Migration

## 🎯 5-Minute Setup

### Step 1: Get Gemini API Key (1 min)

1. Go to https://aistudio.google.com/app/apikey
2. Click **"Get API Key"**
3. Copy your key (starts with `AIza...`)

### Step 2: Add to Environment (30 sec)

Create or update `.env.local` in project root:

```bash
GEMINI_API_KEY=AIzaSy_your_key_here
```

### Step 3: Run Database Migration (2 min)

**Via Supabase Dashboard:**

1. Open https://supabase.com/dashboard
2. Go to your project
3. Click **SQL Editor** in sidebar
4. Run this SQL:

```sql
-- Drop old index
DROP INDEX IF EXISTS document_embeddings_embedding_idx;

-- Update to 768 dimensions (Gemini)
ALTER TABLE document_embeddings 
ALTER COLUMN embedding TYPE vector(768);

-- Recreate index
CREATE INDEX document_embeddings_embedding_idx 
ON document_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Update match function
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
```

5. Click **Run**

### Step 4: Restart Dev Server (30 sec)

```bash
# Stop the current server (Ctrl+C)
# Then restart
pnpm dev
```

### Step 5: Regenerate Embeddings (1 min per document)

1. Go to a Topic/Project
2. Click on each document
3. Click the **🔄 Re-process** button
4. Wait for "✅ Embeddings processed" toast

---

## ✅ You're Done!

Test it:
1. Upload a new PDF
2. Ask a question in Chat
3. Check server logs for:
   ```
   🔍 Semantic Search: "your question"
     - Results found: 2
     - Top similarity: 0.782
   ```

---

## 💰 Cost Comparison

| Service | OpenAI | Gemini | Savings |
|---------|--------|--------|---------|
| Embeddings | $0.13/1M | **FREE** | 100% |
| Chat | $10/1M | $1.25/1M | 88% |
| **Total** | $10.13 | $1.25 | **88%** |

---

## 🐛 Issues?

**Chat says "I don't have information":**
- Did you re-process documents?
- Check `.env.local` has `GEMINI_API_KEY`
- Restart dev server

**"Bucket not found":**
- Run `004_create_documents_bucket.sql` migration first

**See full guide:** `GEMINI_MIGRATION_GUIDE.md`

---

**That's it!** Enjoy 88% cost savings! 🎉
