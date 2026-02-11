-- Quick SQL queries to check embedding status
-- Run these in Supabase SQL Editor

-- 1. Count documents vs embeddings
SELECT 
  'Total Documents' as metric,
  COUNT(*) as count
FROM documents
UNION ALL
SELECT 
  'Documents with Embeddings' as metric,
  COUNT(DISTINCT document_id) as count
FROM document_embeddings
UNION ALL
SELECT 
  'Total Embedding Chunks' as metric,
  COUNT(*) as count
FROM document_embeddings;

-- 2. Find documents WITHOUT embeddings (need re-processing)
SELECT 
  d.id,
  d.title,
  d.type,
  d.created_at,
  CASE 
    WHEN d.content IS NULL OR d.content = '' THEN 'No content'
    ELSE 'Has content - needs processing'
  END as status
FROM documents d
LEFT JOIN document_embeddings e ON d.id = e.document_id
WHERE e.id IS NULL
ORDER BY d.created_at DESC;

-- 3. Documents with embeddings (already processed)
SELECT 
  d.id,
  d.title,
  d.type,
  COUNT(e.id) as chunk_count,
  d.created_at
FROM documents d
INNER JOIN document_embeddings e ON d.id = e.document_id
GROUP BY d.id, d.title, d.type, d.created_at
ORDER BY d.created_at DESC;

-- 4. Embedding statistics by topic
SELECT 
  t.title as topic,
  COUNT(DISTINCT d.id) as total_docs,
  COUNT(DISTINCT e.document_id) as docs_with_embeddings,
  COUNT(e.id) as total_chunks,
  ROUND(AVG(LENGTH(e.chunk_text))) as avg_chunk_length
FROM topics t
LEFT JOIN documents d ON t.id = d.topic_id
LEFT JOIN document_embeddings e ON d.id = e.document_id
GROUP BY t.id, t.title
ORDER BY total_docs DESC;

-- 5. Recent embedding activity (last 24 hours)
SELECT 
  d.title,
  COUNT(e.id) as chunks_created,
  MAX(e.created_at) as last_processed
FROM document_embeddings e
JOIN documents d ON e.document_id = d.id
WHERE e.created_at > NOW() - INTERVAL '24 hours'
GROUP BY d.id, d.title
ORDER BY last_processed DESC;
