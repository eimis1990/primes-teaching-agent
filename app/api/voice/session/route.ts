import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createElevenLabsClient } from '@/lib/voice/elevenlabs-client'

/**
 * POST /api/voice/session
 * Create a new voice conversation session
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
    
    const { topicIds = [], agentId } = await request.json()
    
    // Check if ElevenLabs is configured
    const elevenLabsClient = createElevenLabsClient()
    if (!elevenLabsClient) {
      return NextResponse.json(
        { error: 'ElevenLabs not configured. Please set ELEVENLABS_API_KEY environment variable.' },
        { status: 503 }
      )
    }
    
    // Create session
    const agentIdToUse = agentId || process.env.ELEVENLABS_AGENT_ID
    if (!agentIdToUse) {
      return NextResponse.json(
        { error: 'No agent ID provided. Please set ELEVENLABS_AGENT_ID environment variable.' },
        { status: 400 }
      )
    }
    
    const session = await elevenLabsClient.createSession(
      agentIdToUse,
      user.id,
      topicIds
    )
    
    return NextResponse.json({
      sessionId: session.sessionId,
      agentId: session.agentId,
      status: session.status,
      startedAt: session.startedAt
    })
  } catch (error) {
    console.error('Error creating voice session:', error)
    return NextResponse.json(
      { error: 'Failed to create voice session' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/voice/session?sessionId=xxx
 * Get voice session status
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
    const sessionId = searchParams.get('sessionId')
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      )
    }
    
    const elevenLabsClient = createElevenLabsClient()
    if (!elevenLabsClient) {
      return NextResponse.json(
        { error: 'ElevenLabs not configured' },
        { status: 503 }
      )
    }
    
    const session = await elevenLabsClient.getSessionStatus(sessionId)
    
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(session)
  } catch (error) {
    console.error('Error getting voice session:', error)
    return NextResponse.json(
      { error: 'Failed to get session status' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/voice/session?sessionId=xxx
 * End a voice session
 */
export async function DELETE(request: NextRequest) {
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
    const sessionId = searchParams.get('sessionId')
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      )
    }
    
    const elevenLabsClient = createElevenLabsClient()
    if (!elevenLabsClient) {
      return NextResponse.json(
        { error: 'ElevenLabs not configured' },
        { status: 503 }
      )
    }
    
    await elevenLabsClient.endSession(sessionId)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error ending voice session:', error)
    return NextResponse.json(
      { error: 'Failed to end session' },
      { status: 500 }
    )
  }
}
