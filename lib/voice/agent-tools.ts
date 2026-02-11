/**
 * Custom tools for ElevenLabs Voice Agent
 * 
 * These tools allow the voice agent to query the knowledge base
 * and provide accurate answers with citations.
 */

import { semanticSearch } from '@/lib/rag/query'
import { generateAnswerSync } from '@/lib/rag/generator'

/**
 * Tool definition for ElevenLabs agent
 */
export interface AgentTool {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, {
      type: string
      description: string
      enum?: string[]
    }>
    required: string[]
  }
  handler: (params: any, context: ToolContext) => Promise<any>
}

export interface ToolContext {
  userId: string
  topicIds: string[]
  conversationHistory?: Array<{ role: 'user' | 'assistant', content: string }>
}

/**
 * Search the knowledge base tool
 */
export const searchKnowledgeBaseTool: AgentTool = {
  name: 'search_knowledge_base',
  description: 'Search the user\'s personal knowledge base for information. Use this when the user asks a question that requires looking up information from their documents.',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query or question to find information about'
      },
      mode: {
        type: 'string',
        description: 'Search mode: "normal" for detailed answers, "operational" for concise, actionable information',
        enum: ['normal', 'operational']
      }
    },
    required: ['query']
  },
  handler: async (params: { query: string, mode?: 'normal' | 'operational' }, context: ToolContext) => {
    try {
      const { query, mode = 'normal' } = params
      const { userId, topicIds, conversationHistory = [] } = context
      
      // Generate answer using RAG
      const result = await generateAnswerSync({
        query,
        topicIds: topicIds.length > 0 ? topicIds : undefined,
        conversationHistory,
        mode
      })
      
      // Format response for voice
      let response = result.answer
      
      // Add verbal source citations
      if (result.sources.length > 0) {
        const sourceNames = result.sources
          .slice(0, 3) // Limit to top 3 sources for voice
          .map(s => s.documentTitle)
          .join(', ')
        
        response += `\n\nThis information comes from: ${sourceNames}`
      }
      
      return {
        answer: response,
        sourceCount: result.sources.length
      }
    } catch (error) {
      console.error('Error in search_knowledge_base tool:', error)
      return {
        answer: "I'm sorry, I encountered an error searching the knowledge base. Please try again.",
        sourceCount: 0
      }
    }
  }
}

/**
 * Get specific document tool
 */
export const getDocumentTool: AgentTool = {
  name: 'get_document',
  description: 'Retrieve specific information from a document by its title or ID. Use this when the user asks about a specific document.',
  parameters: {
    type: 'object',
    properties: {
      documentTitle: {
        type: 'string',
        description: 'The title of the document to retrieve'
      }
    },
    required: ['documentTitle']
  },
  handler: async (params: { documentTitle: string }, context: ToolContext) => {
    try {
      // Search for the document by title
      const results = await semanticSearch(params.documentTitle, {
        topicIds: context.topicIds,
        topK: 3
      })
      
      if (results.length === 0) {
        return {
          found: false,
          message: `I couldn't find a document titled "${params.documentTitle}"`
        }
      }
      
      // Return the most relevant chunks
      const content = results
        .map(r => r.chunkText)
        .join('\n\n')
      
      return {
        found: true,
        documentTitle: results[0].metadata.documentTitle,
        content: content.slice(0, 1000) // Limit for voice
      }
    } catch (error) {
      console.error('Error in get_document tool:', error)
      return {
        found: false,
        message: "I encountered an error retrieving the document."
      }
    }
  }
}

/**
 * List available topics tool
 */
export const listTopicsTool: AgentTool = {
  name: 'list_topics',
  description: 'List the topics (folders) available in the knowledge base. Use this when the user asks what topics or areas they have information about.',
  parameters: {
    type: 'object',
    properties: {},
    required: []
  },
  handler: async (params: {}, context: ToolContext) => {
    try {
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      
      const { data: topics, error } = await supabase
        .from('topics')
        .select('id, title, description')
        .eq('user_id', context.userId)
        .order('title')
      
      if (error) throw error
      
      if (!topics || topics.length === 0) {
        return {
          topics: [],
          message: "You don't have any topics set up yet."
        }
      }
      
      // Format for voice
      const topicList = topics.map(t => t.title).join(', ')
      
      return {
        topics: topics.map(t => ({ id: t.id, title: t.title })),
        message: `You have information organized into these topics: ${topicList}`
      }
    } catch (error) {
      console.error('Error in list_topics tool:', error)
      return {
        topics: [],
        message: "I encountered an error listing topics."
      }
    }
  }
}

/**
 * Get all tools for the agent
 */
export function getAgentTools(): AgentTool[] {
  return [
    searchKnowledgeBaseTool,
    getDocumentTool,
    listTopicsTool
  ]
}

/**
 * Execute a tool by name
 */
export async function executeTool(
  toolName: string,
  params: any,
  context: ToolContext
): Promise<any> {
  const tools = getAgentTools()
  const tool = tools.find(t => t.name === toolName)
  
  if (!tool) {
    throw new Error(`Tool ${toolName} not found`)
  }
  
  return tool.handler(params, context)
}
