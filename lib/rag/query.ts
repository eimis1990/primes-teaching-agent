import { createClient } from '@/lib/supabase/server'
import { generateEmbedding } from '@/lib/embeddings/processor'

export interface SearchResult {
  id: string
  documentId: string
  topicId: string
  chunkText: string
  chunkIndex: number
  similarity: number
  metadata: {
    documentTitle?: string
    documentType?: 'text' | 'voice'
    totalChunks?: number
  }
}

export interface SemanticSearchOptions {
  topicIds?: string[]
  topK?: number
  similarityThreshold?: number
}

/**
 * Perform semantic search across document embeddings
 */
export async function semanticSearch(
  query: string,
  options: SemanticSearchOptions = {}
): Promise<SearchResult[]> {
  const {
    topicIds,
    topK = 5,
    similarityThreshold = 0.5 // Lowered from 0.7 for better recall
  } = options
  
  try {
    const supabase = await createClient()
    
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query, 'RETRIEVAL_QUERY')
    
    console.log(`🔍 Semantic Search: "${query}"`)
    console.log(`  - TopicIds: ${topicIds ? JSON.stringify(topicIds) : 'ALL'}`)
    console.log(`  - TopK: ${topK}, Threshold: ${similarityThreshold}`)
    
    // Call the match_documents function
    const { data, error } = await supabase.rpc('match_documents', {
      query_embedding: queryEmbedding,
      match_count: topK,
      filter_topic_ids: topicIds || null,
      similarity_threshold: similarityThreshold
    })
    
    if (error) {
      console.error('❌ Error in semantic search:', error)
      throw error
    }
    
    console.log(`  - Results found: ${data?.length || 0}`)
    if (data && data.length > 0) {
      console.log(`  - Top similarity: ${data[0].similarity.toFixed(3)}`)
      console.log(`  - Chunk preview: "${data[0].chunk_text.substring(0, 100)}..."`)
    }
    
    // Transform results
    const results: SearchResult[] = (data || []).map((row: any) => ({
      id: row.id,
      documentId: row.document_id,
      topicId: row.topic_id,
      chunkText: row.chunk_text,
      chunkIndex: row.chunk_index,
      similarity: row.similarity,
      metadata: row.metadata || {}
    }))
    
    return results
  } catch (error) {
    console.error('Semantic search failed:', error)
    throw error
  }
}

/**
 * Search across multiple topics and label sources
 */
export async function crossTopicSearch(
  query: string,
  topicIds: string[],
  topK: number = 10
): Promise<Map<string, SearchResult[]>> {
  try {
    const supabase = await createClient()
    
    // Get topic details for labeling
    const { data: topics, error: topicError } = await supabase
      .from('topics')
      .select('id, title')
      .in('id', topicIds)
    
    if (topicError) throw topicError
    
    const topicMap = new Map(topics?.map(t => [t.id, t.title]) || [])
    
    // Perform search across all topics
    const results = await semanticSearch(query, {
      topicIds,
      topK,
      similarityThreshold: 0.65 // Slightly lower threshold for cross-topic
    })
    
    // Group results by topic
    const resultsByTopic = new Map<string, SearchResult[]>()
    
    for (const result of results) {
      const topicId = result.topicId
      if (!resultsByTopic.has(topicId)) {
        resultsByTopic.set(topicId, [])
      }
      resultsByTopic.get(topicId)!.push(result)
    }
    
    return resultsByTopic
  } catch (error) {
    console.error('Cross-topic search failed:', error)
    throw error
  }
}

/**
 * Get document details for citation
 */
export async function getDocumentDetails(documentId: string) {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('documents')
      .select('id, title, type, topic_id, created_at')
      .eq('id', documentId)
      .single()
    
    if (error) throw error
    
    return data
  } catch (error) {
    console.error('Error fetching document details:', error)
    return null
  }
}
