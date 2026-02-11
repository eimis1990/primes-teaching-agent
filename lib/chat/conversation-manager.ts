import { createClient } from '@/lib/supabase/server'

export interface Conversation {
  id: string
  userId: string
  topicIds: string[]
  title: string | null
  createdAt: string
  updatedAt: string
}

export interface Message {
  id: string
  conversationId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  sources: any[]
  createdAt: string
}

/**
 * Create a new conversation
 */
export async function createConversation(
  userId: string,
  topicIds: string[] = [],
  title?: string
): Promise<Conversation | null> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        user_id: userId,
        topic_ids: topicIds,
        title: title || 'New Conversation'
      })
      .select()
      .single()
    
    if (error) throw error
    
    return {
      id: data.id,
      userId: data.user_id,
      topicIds: data.topic_ids,
      title: data.title,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }
  } catch (error) {
    console.error('Error creating conversation:', error)
    return null
  }
}

/**
 * Get conversation by ID
 */
export async function getConversation(conversationId: string): Promise<Conversation | null> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single()
    
    if (error) throw error
    
    return {
      id: data.id,
      userId: data.user_id,
      topicIds: data.topic_ids,
      title: data.title,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }
  } catch (error) {
    console.error('Error fetching conversation:', error)
    return null
  }
}

/**
 * Get all conversations for a user
 */
export async function getUserConversations(
  userId: string,
  limit: number = 50
): Promise<Conversation[]> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    
    return (data || []).map(conv => ({
      id: conv.id,
      userId: conv.user_id,
      topicIds: conv.topic_ids,
      title: conv.title,
      createdAt: conv.created_at,
      updatedAt: conv.updated_at
    }))
  } catch (error) {
    console.error('Error fetching user conversations:', error)
    return []
  }
}

/**
 * Add a message to a conversation
 */
export async function addMessage(
  conversationId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  sources: any[] = []
): Promise<Message | null> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role,
        content,
        sources
      })
      .select()
      .single()
    
    if (error) throw error
    
    // Update conversation updated_at timestamp
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId)
    
    return {
      id: data.id,
      conversationId: data.conversation_id,
      role: data.role,
      content: data.content,
      sources: data.sources,
      createdAt: data.created_at
    }
  } catch (error) {
    console.error('Error adding message:', error)
    return null
  }
}

/**
 * Get messages for a conversation
 */
export async function getConversationMessages(
  conversationId: string,
  limit: number = 100
): Promise<Message[]> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(limit)
    
    if (error) throw error
    
    return (data || []).map(msg => ({
      id: msg.id,
      conversationId: msg.conversation_id,
      role: msg.role,
      content: msg.content,
      sources: msg.sources || [],
      createdAt: msg.created_at
    }))
  } catch (error) {
    console.error('Error fetching messages:', error)
    return []
  }
}

/**
 * Update conversation title
 */
export async function updateConversationTitle(
  conversationId: string,
  title: string
): Promise<boolean> {
  try {
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('conversations')
      .update({ 
        title,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId)
    
    if (error) throw error
    
    return true
  } catch (error) {
    console.error('Error updating conversation title:', error)
    return false
  }
}

/**
 * Delete a conversation
 */
export async function deleteConversation(conversationId: string): Promise<boolean> {
  try {
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId)
    
    if (error) throw error
    
    return true
  } catch (error) {
    console.error('Error deleting conversation:', error)
    return false
  }
}

/**
 * Generate a title for a conversation based on first message
 */
export async function generateConversationTitle(firstMessage: string): Promise<string> {
  // Simple title generation - take first 50 chars
  const title = firstMessage.slice(0, 50).trim()
  return title.length < firstMessage.length ? title + '...' : title
}
