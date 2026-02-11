"use server"

import { processDocument, deleteDocumentEmbeddings, reprocessTopic } from '@/lib/embeddings/processor'
import { createClient } from '@/lib/supabase/server'

/**
 * Server action to process a document and generate embeddings
 */
export async function processDocumentAction(documentId: string) {
  try {
    const supabase = await createClient()
    
    // Get document details
    const { data: doc, error: fetchError } = await supabase
      .from('documents')
      .select('id, topic_id, user_id, title, type, content')
      .eq('id', documentId)
      .single()
    
    if (fetchError || !doc) {
      return { success: false, error: 'Document not found' }
    }
    
    if (!doc.content || doc.content.trim() === '') {
      return { success: false, error: 'Document has no content to process' }
    }
    
    // Delete existing embeddings for this document
    await deleteDocumentEmbeddings(documentId)
    
    // Process the document
    const result = await processDocument(
      doc.id,
      doc.topic_id,
      doc.user_id,
      doc.content,
      doc.title,
      doc.type as 'text' | 'voice'
    )
    
    return result
  } catch (error) {
    console.error('Error in processDocumentAction:', error)
    return {
      success: false,
      chunkCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Server action to reprocess all documents in a topic
 */
export async function reprocessTopicAction(topicId: string) {
  try {
    const supabase = await createClient()
    
    // Verify user owns the topic
    const { data: topic, error: topicError } = await supabase
      .from('topics')
      .select('user_id')
      .eq('id', topicId)
      .single()
    
    if (topicError || !topic) {
      return { success: false, error: 'Topic not found' }
    }
    
    const result = await reprocessTopic(topicId, topic.user_id)
    return result
  } catch (error) {
    console.error('Error in reprocessTopicAction:', error)
    return {
      success: false,
      processedCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Server action to delete embeddings for a document
 */
export async function deleteDocumentEmbeddingsAction(documentId: string) {
  try {
    const result = await deleteDocumentEmbeddings(documentId)
    return result
  } catch (error) {
    console.error('Error in deleteDocumentEmbeddingsAction:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Get embedding status for a document
 */
export async function getDocumentEmbeddingStatus(documentId: string) {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('document_embeddings')
      .select('id')
      .eq('document_id', documentId)
      .limit(1)
    
    if (error) throw error
    
    return {
      success: true,
      hasEmbeddings: (data && data.length > 0)
    }
  } catch (error) {
    console.error('Error checking embedding status:', error)
    return {
      success: false,
      hasEmbeddings: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
