import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { processDocumentAction } from '@/app/actions/embeddings'

export const runtime = 'nodejs' // Need nodejs for longer processing time

/**
 * POST /api/embeddings/process
 * Process a document and generate embeddings
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
    
    const { documentId } = await request.json()
    
    if (!documentId) {
      return NextResponse.json(
        { error: 'documentId is required' },
        { status: 400 }
      )
    }
    
    // Process the document
    const result = await processDocumentAction(documentId)
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to process document' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      chunkCount: result.chunkCount
    })
  } catch (error) {
    console.error('Error in embeddings process API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
