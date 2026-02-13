import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'

// Use Gemini for embeddings (FREE up to 1M tokens/month!)
// Model: gemini-embedding-001 with 768 dimensions
// Updated Feb 2026 (text-embedding-004 was deprecated Jan 2026)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export interface ChunkMetadata {
  documentTitle: string
  orgId: string | null
  topicId: string
  documentId: string
  chunkIndex: number
  totalChunks: number
  section: string
  updatedAt: string
  acl: {
    scope: 'org'
    roles: string[]
  }
  documentType: 'text' | 'voice'
  chunkingVersion: string
}

export interface DocumentChunk {
  text: string
  index: number
  metadata: ChunkMetadata
}

export type EmbeddingTaskType = 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY'
export const CHUNKING_VERSION = 'v3_sentence_450tok_overlap70'
export const DEFAULT_CHUNK_TOKENS = 450
export const DEFAULT_CHUNK_OVERLAP_TOKENS = 70

/**
 * Split text into semantic chunks
 * Aims for 300-500 tokens per chunk with overlap
 * Handles both paragraph-based and sentence-based splitting
 */
export function chunkText(text: string, maxTokens: number = DEFAULT_CHUNK_TOKENS): string[] {
  // Simple approximation: 1 token ≈ 4 characters
  const maxChars = maxTokens * 4
  const overlapChars = DEFAULT_CHUNK_OVERLAP_TOKENS * 4
  
  const chunks: string[] = []
  
  // Normalize text: clean up whitespace
  const normalizedText = text
    .replace(/\r\n/g, '\n')  // Normalize line endings
    .replace(/\n{3,}/g, '\n\n')  // Max 2 consecutive newlines
    .trim()
  
  // Try to split by paragraphs first (double newline)
  let paragraphs = normalizedText.split(/\n\n+/)
  
  // If we only got 1 paragraph (common with PDFs), split by sentences
  if (paragraphs.length === 1 && normalizedText.length > maxChars) {
    // Split by sentence boundaries (., !, ?, or single newline)
    paragraphs = normalizedText.split(/(?<=[.!?])\s+|\n/)
  }
  
  let currentChunk = ''
  
  for (const paragraph of paragraphs) {
    const trimmedPara = paragraph.trim()
    if (!trimmedPara) continue
    
    // If this single paragraph is too large, split it further
    if (trimmedPara.length > maxChars) {
      // Save current chunk if it exists
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim())
        currentChunk = ''
      }
      
      // Split large paragraph by sentences
      const sentences = trimmedPara.split(/(?<=[.!?])\s+/)
      let tempChunk = ''
      
      for (const sentence of sentences) {
        if (tempChunk.length + sentence.length > maxChars && tempChunk.length > 0) {
          chunks.push(tempChunk.trim())
          // Add overlap from previous chunk
          const words = tempChunk.split(' ')
          const overlapWords = words.slice(-Math.floor(overlapChars / 5))
          tempChunk = overlapWords.join(' ') + ' ' + sentence
        } else {
          tempChunk += (tempChunk ? ' ' : '') + sentence
        }
      }
      
      if (tempChunk.trim()) {
        currentChunk = tempChunk
      }
      continue
    }
    
    // If adding this paragraph exceeds max size, save current chunk
    if (currentChunk.length + trimmedPara.length > maxChars && currentChunk.length > 0) {
      chunks.push(currentChunk.trim())
      
      // Start new chunk with overlap (last part of previous chunk)
      const words = currentChunk.split(' ')
      const overlapWords = words.slice(-Math.floor(overlapChars / 5)) // ~5 chars per word
      currentChunk = overlapWords.join(' ') + '\n\n' + trimmedPara
    } else {
      // Add paragraph to current chunk
      currentChunk += (currentChunk ? '\n\n' : '') + trimmedPara
    }
  }
  
  // Add final chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }
  
  // If no chunks created (very short text), return as single chunk
  if (chunks.length === 0 && normalizedText) {
    chunks.push(normalizedText)
  }
  
  // Log chunking stats for debugging
  console.log(`Chunked text: ${normalizedText.length} chars → ${chunks.length} chunks (policy=${CHUNKING_VERSION})`)
  chunks.forEach((chunk, i) => {
    console.log(`  Chunk ${i + 1}: ${chunk.length} chars (~${Math.round(chunk.length / 4)} tokens)`)
  })
  
  return chunks
}

/**
 * Generate embeddings for a text chunk using Gemini
 * Uses gemini-embedding-001 configured for 768 dimensions
 * FREE up to 1M tokens/month!
 */
export async function generateEmbedding(
  text: string,
  taskType: EmbeddingTaskType = 'RETRIEVAL_DOCUMENT'
): Promise<number[]> {
  try {
    // Check if API key is configured
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured in environment variables')
    }
    
    // Use the current stable model (gemini-embedding-001) with 768 dimensions
    // This matches our database vector(768) configuration
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-embedding-001'
    })
    
    // Generate embedding with 768 dimensions to match DB schema
    const result = await model.embedContent({
      content: { parts: [{ text }] },
      taskType,
      outputDimensionality: 768
    })
    
    // Gemini returns values directly
    if (!result.embedding || !result.embedding.values) {
      throw new Error('Invalid response from Gemini API: no embedding values returned')
    }
    
    return result.embedding.values
  } catch (error) {
    console.error('Error generating embedding with Gemini:', error)
    // Pass through the actual error message
    if (error instanceof Error) {
      throw new Error(`Failed to generate embedding: ${error.message}`)
    }
    throw new Error('Failed to generate embedding: Unknown error')
  }
}

/**
 * Process a document: chunk it and generate embeddings
 */
export async function processDocument(
  documentId: string,
  topicId: string,
  orgId: string | null,
  userId: string,
  content: string,
  documentTitle: string,
  documentType: 'text' | 'voice'
): Promise<{ success: boolean; chunkCount: number; error?: string }> {
  try {
    const supabase = await createClient()
    
    // Chunk the document
    const textChunks = chunkText(content)
    
    if (textChunks.length === 0) {
      return { success: false, chunkCount: 0, error: 'No content to process' }
    }
    
    console.log(`Processing document ${documentId}: ${textChunks.length} chunks`)
    
    // Process chunks in batches to avoid rate limits
    const batchSize = 10
    const embeddingRecords = []
    
    for (let i = 0; i < textChunks.length; i += batchSize) {
      const batch = textChunks.slice(i, i + batchSize)
      
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(textChunks.length / batchSize)}...`)
      
      // Generate embeddings for batch
      const embeddings = await Promise.all(
        batch.map(async (chunk, idx) => {
          try {
            console.log(`Generating embedding for chunk ${i + idx + 1}/${textChunks.length}...`)
            return await generateEmbedding(chunk)
          } catch (error) {
            console.error(`Failed to generate embedding for chunk ${i + idx + 1}:`, error)
            throw error
          }
        })
      )
      
      // Prepare records for insertion
      for (let j = 0; j < batch.length; j++) {
        const chunkIndex = i + j
        const updatedAt = new Date().toISOString()
        const section = `chunk_${chunkIndex + 1}`
        const acl = { scope: 'org' as const, roles: ['admin', 'employee'] }
        embeddingRecords.push({
          org_id: orgId,
          document_id: documentId,
          topic_id: topicId,
          user_id: userId,
          chunk_text: batch[j],
          chunk_index: chunkIndex,
          embedding: embeddings[j],
          section,
          acl,
          updated_at: updatedAt,
          metadata: {
            documentTitle,
            orgId,
            topicId,
            documentId,
            chunkIndex,
            documentType,
            chunkingVersion: CHUNKING_VERSION,
            totalChunks: textChunks.length,
            section,
            updatedAt,
            acl,
          }
        })
      }
    }
    
    // Insert all embeddings into database
    const { error: insertError } = await supabase
      .from('document_embeddings')
      .insert(embeddingRecords)
    
    if (insertError) {
      console.error('Error inserting embeddings:', insertError)
      throw insertError
    }
    
    console.log(`Successfully processed document ${documentId}: ${textChunks.length} chunks embedded`)
    
    return { success: true, chunkCount: textChunks.length }
  } catch (error) {
    console.error('Error processing document:', error)
    return {
      success: false,
      chunkCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Delete all embeddings for a document
 */
export async function deleteDocumentEmbeddings(
  documentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('document_embeddings')
      .delete()
      .eq('document_id', documentId)
    
    if (error) {
      console.error('Error deleting embeddings:', error)
      throw error
    }
    
    return { success: true }
  } catch (error) {
    console.error('Error deleting embeddings:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Reprocess all documents in a topic
 */
export async function reprocessTopic(
  topicId: string,
  userId: string
): Promise<{ success: boolean; processedCount: number; error?: string }> {
  try {
    const supabase = await createClient()
    
    // Get all documents in the topic
    const { data: documents, error: fetchError } = await supabase
      .from('documents')
      .select('id, title, type, content, org_id, user_id')
      .eq('topic_id', topicId)
      .eq('user_id', userId)
    
    if (fetchError) throw fetchError
    if (!documents || documents.length === 0) {
      return { success: true, processedCount: 0 }
    }
    
    // Delete existing embeddings for the topic
    await supabase
      .from('document_embeddings')
      .delete()
      .eq('topic_id', topicId)
    
    // Process each document
    let processedCount = 0
    for (const doc of documents) {
      if (!doc.content || doc.content.trim() === '') continue
      
      const result = await processDocument(
        doc.id,
        topicId,
        doc.org_id || null,
        userId,
        doc.content,
        doc.title,
        doc.type as 'text' | 'voice'
      )
      
      if (result.success) {
        processedCount++
      }
    }
    
    return { success: true, processedCount }
  } catch (error) {
    console.error('Error reprocessing topic:', error)
    return {
      success: false,
      processedCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
