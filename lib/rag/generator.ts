import { GoogleGenerativeAI } from '@google/generative-ai'
import { semanticSearch, crossTopicSearch, getDocumentDetails, type SearchResult } from './query'

// Use Gemini 2.5 Pro (70% cheaper than GPT-4!)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export interface RAGContext {
  query: string
  topicIds?: string[]
  conversationHistory?: Array<{ role: 'user' | 'assistant', content: string }>
  mode?: 'normal' | 'operational' // operational = concise, actionable
}

export interface RAGResponse {
  answer: string
  sources: Array<{
    documentId: string
    documentTitle: string
    chunkText: string
    topicId: string
    topicTitle?: string
  }>
}

/**
 * Build context from search results
 */
function buildContext(results: SearchResult[], topicTitles?: Map<string, string>): string {
  if (results.length === 0) {
    return 'No relevant information found in the knowledge base.'
  }
  
  let context = 'Relevant information from the knowledge base:\n\n'
  
  // Group by document to avoid repetition
  const byDocument = new Map<string, SearchResult[]>()
  for (const result of results) {
    if (!byDocument.has(result.documentId)) {
      byDocument.set(result.documentId, [])
    }
    byDocument.get(result.documentId)!.push(result)
  }
  
  let sourceIndex = 1
  byDocument.forEach((chunks, documentId) => {
    const firstChunk = chunks[0]
    const docTitle = firstChunk.metadata.documentTitle || 'Untitled'
    const topicTitle = topicTitles?.get(firstChunk.topicId)
    
    context += `[Source ${sourceIndex}] ${docTitle}`
    if (topicTitle) {
      context += ` (Topic: ${topicTitle})`
    }
    context += ':\n'
    
    // Include all relevant chunks from this document
    chunks.forEach(chunk => {
      context += `${chunk.chunkText}\n\n`
    })
    
    sourceIndex++
  })
  
  return context
}

/**
 * Generate system prompt based on mode
 */
function getSystemPrompt(mode: 'normal' | 'operational' = 'normal'): string {
  const basePrompt = `You are an AI teaching assistant helping users learn from their personal knowledge base. 
Your role is to answer questions accurately based ONLY on the provided context from their documents.

Key principles:
- Only use information from the provided context
- Always cite your sources using [Source N] notation
- If the answer isn't in the context, say "I don't have information about that in your knowledge base"
- Be clear, accurate, and educational
- When referencing specific documents, mention their titles

Formatting guidelines:
- Use **markdown formatting** to make your responses clear and readable
- Use **bold** for important terms and key concepts
- Use *italic* for emphasis
- Use bullet points (-) or numbered lists (1.) for multiple items
- Use \`code formatting\` for technical terms, file names, or code snippets
- Use ### headings to organize longer responses
- Use > blockquotes for direct quotes from source documents
- Keep responses well-structured and easy to scan`

  if (mode === 'operational') {
    return basePrompt + `\n\nOPERATIONAL MODE: Provide concise, actionable answers. Focus on step-by-step instructions and critical information. Be brief but complete. Use numbered lists for steps.`
  }
  
  return basePrompt
}

/**
 * Generate RAG answer with streaming support using Gemini 2.5 Pro
 */
export async function generateAnswer(
  context: RAGContext
): Promise<ReadableStream> {
  const { query, topicIds, conversationHistory = [], mode = 'normal' } = context
  
  // Perform semantic search
  const searchResults = topicIds && topicIds.length > 0
    ? await semanticSearch(query, { topicIds, topK: 5 })
    : await semanticSearch(query, { topK: 5 })
  
  // Build context from search results
  const contextText = buildContext(searchResults)
  
  // Build conversation history for Gemini
  const history = conversationHistory.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }))
  
  // Build the full prompt with system instructions and context
  const prompt = `${getSystemPrompt(mode)}

Context:
${contextText}

User question: ${query}`
  
  // Use Gemini 2.5 Pro for streaming responses
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.5-pro',
    generationConfig: {
      temperature: 0.3, // Lower temperature for more factual responses
      maxOutputTokens: mode === 'operational' ? 500 : 1500,
    }
  })
  
  // Start chat with history
  const chat = model.startChat({ history })
  
  // Stream response from Gemini
  const result = await chat.sendMessageStream(prompt)
  
  // Transform Gemini stream to web stream
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of result.stream) {
          const text = chunk.text()
          if (text) {
            controller.enqueue(text)
          }
        }
        controller.close()
      } catch (error) {
        console.error('Error in Gemini streaming:', error)
        controller.error(error)
      }
    }
  })
}

/**
 * Generate answer without streaming (for server-side use) using Gemini 2.5 Pro
 */
export async function generateAnswerSync(
  context: RAGContext
): Promise<RAGResponse> {
  const { query, topicIds, conversationHistory = [], mode = 'normal' } = context
  
  // Perform semantic search
  const searchResults = topicIds && topicIds.length > 0
    ? await semanticSearch(query, { topicIds, topK: 5 })
    : await semanticSearch(query, { topK: 5 })
  
  // Build context from search results
  const contextText = buildContext(searchResults)
  
  // Build conversation history for Gemini
  const history = conversationHistory.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }))
  
  // Build the full prompt with system instructions and context
  const prompt = `${getSystemPrompt(mode)}

Context:
${contextText}

User question: ${query}`
  
  // Use Gemini 2.5 Pro
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.5-pro',
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: mode === 'operational' ? 500 : 1500,
    }
  })
  
  // Start chat with history
  const chat = model.startChat({ history })
  
  // Get response from Gemini
  const result = await chat.sendMessage(prompt)
  const answer = result.response.text()
  
  // Build sources array
  const sources = await Promise.all(
    searchResults.map(async (result) => {
      const docDetails = await getDocumentDetails(result.documentId)
      return {
        documentId: result.documentId,
        documentTitle: result.metadata.documentTitle || docDetails?.title || 'Untitled',
        chunkText: result.chunkText,
        topicId: result.topicId,
      }
    })
  )
  
  return {
    answer,
    sources
  }
}

/**
 * Generate answer for cross-topic queries using Gemini 2.5 Pro
 */
export async function generateCrossTopicAnswer(
  query: string,
  topicIds: string[],
  conversationHistory: Array<{ role: 'user' | 'assistant', content: string }> = []
): Promise<ReadableStream> {
  // Get results grouped by topic
  const resultsByTopic = await crossTopicSearch(query, topicIds, 10)
  
  // Flatten results but keep track of topic
  const allResults: SearchResult[] = []
  const topicTitles = new Map<string, string>()
  
  // We need to fetch topic titles
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: topics } = await supabase
    .from('topics')
    .select('id, title')
    .in('id', topicIds)
  
  topics?.forEach(t => topicTitles.set(t.id, t.title))
  
  resultsByTopic.forEach(results => {
    allResults.push(...results)
  })
  
  // Sort by similarity
  allResults.sort((a, b) => b.similarity - a.similarity)
  
  // Take top results
  const topResults = allResults.slice(0, 8)
  
  // Build context with topic labels
  const contextText = buildContext(topResults, topicTitles)
  
  // Build conversation history for Gemini
  const history = conversationHistory.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }))
  
  // Build the full prompt
  const prompt = `${getSystemPrompt('normal')}

You are answering based on information from multiple topics. Clearly indicate which topic each piece of information comes from.

Context:
${contextText}

User question: ${query}`
  
  // Use Gemini 2.5 Pro for streaming
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.5-pro',
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 1500,
    }
  })
  
  // Start chat with history
  const chat = model.startChat({ history })
  
  // Stream response from Gemini
  const result = await chat.sendMessageStream(prompt)
  
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of result.stream) {
          const text = chunk.text()
          if (text) {
            controller.enqueue(text)
          }
        }
        controller.close()
      } catch (error) {
        console.error('Error in Gemini cross-topic streaming:', error)
        controller.error(error)
      }
    }
  })
}
