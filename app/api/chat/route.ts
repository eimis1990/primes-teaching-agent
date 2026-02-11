import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateAnswer, generateCrossTopicAnswer, generateAnswerSync } from '@/lib/rag/generator'
import { 
  createConversation, 
  addMessage, 
  getConversationMessages,
  generateConversationTitle
} from '@/lib/chat/conversation-manager'

export const runtime = 'nodejs'

interface ChatRequest {
  message: string
  conversationId?: string
  topicIds?: string[]
  mode?: 'normal' | 'operational'
  stream?: boolean
}

/**
 * POST /api/chat
 * Handle chat requests with RAG
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const body: ChatRequest = await request.json()
    const { 
      message, 
      conversationId, 
      topicIds = [], 
      mode = 'normal',
      stream = true 
    } = body
    
    if (!message || message.trim() === '') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }
    
    // Get or create conversation
    let convId = conversationId
    let conversationHistory: Array<{ role: 'user' | 'assistant', content: string }> = []
    
    if (convId) {
      // Get existing conversation history
      const messages = await getConversationMessages(convId)
      conversationHistory = messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content
        }))
    } else {
      // Create new conversation
      const title = await generateConversationTitle(message)
      const newConv = await createConversation(user.id, topicIds, title)
      if (!newConv) {
        return NextResponse.json(
          { error: 'Failed to create conversation' },
          { status: 500 }
        )
      }
      convId = newConv.id
    }
    
    // Add user message to conversation
    await addMessage(convId, 'user', message)
    
    // Generate answer based on whether multiple topics are involved
    if (stream) {
      // Streaming response
      const answerStream = topicIds.length > 1
        ? await generateCrossTopicAnswer(message, topicIds, conversationHistory)
        : await generateAnswer({
            query: message,
            topicIds: topicIds.length > 0 ? topicIds : undefined,
            conversationHistory,
            mode
          })
      
      // We need to capture the full response to save it
      let fullResponse = ''
      const transformStream = new TransformStream({
        transform(chunk, controller) {
          const text = typeof chunk === 'string' ? chunk : new TextDecoder().decode(chunk)
          fullResponse += text
          controller.enqueue(chunk)
        },
        flush() {
          // Save assistant response to conversation (fire and forget)
          addMessage(convId!, 'assistant', fullResponse).catch(console.error)
        }
      })
      
      return new Response(answerStream.pipeThrough(transformStream), {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'X-Conversation-Id': convId
        }
      })
    } else {
      // Non-streaming response
      const result = await generateAnswerSync({
        query: message,
        topicIds: topicIds.length > 0 ? topicIds : undefined,
        conversationHistory,
        mode
      })
      
      // Save assistant response
      await addMessage(convId, 'assistant', result.answer, result.sources)
      
      return NextResponse.json({
        conversationId: convId,
        answer: result.answer,
        sources: result.sources
      })
    }
  } catch (error) {
    console.error('Error in chat API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/chat?conversationId=xxx
 * Get conversation messages
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId')
    
    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversationId is required' },
        { status: 400 }
      )
    }
    
    const messages = await getConversationMessages(conversationId)
    
    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
