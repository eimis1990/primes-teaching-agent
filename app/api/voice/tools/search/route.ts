import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { generateEmbedding } from '@/lib/embeddings/processor'

type ToolPayload = {
  query?: string
  mode?: 'normal' | 'operational'
  topic_id?: string
  topicId?: string
  org_id?: string
  orgId?: string
  top_k?: number
  similarity_threshold?: number
  dynamic_variables?: Record<string, unknown>
  variables?: Record<string, unknown>
  parameters?: Record<string, unknown>
  args?: Record<string, unknown>
}

function toolDebugEnabled() {
  return process.env.ELEVENLABS_TOOL_DEBUG === 'true' || process.env.NODE_ENV !== 'production'
}

function toolLog(message: string, data?: Record<string, unknown>) {
  if (!toolDebugEnabled()) return
  if (data) {
    console.log(`[voice-tool/search] ${message}`, data)
    return
  }
  console.log(`[voice-tool/search] ${message}`)
}

function getBearerToken(request: NextRequest): string | null {
  const auth = request.headers.get('authorization')
  if (!auth) return null
  const [scheme, token] = auth.split(' ')
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null
  return token
}

function normalizePayload(body: ToolPayload) {
  const nested = [body.parameters, body.args, body.dynamic_variables, body.variables]
    .filter(Boolean)
    .reduce<Record<string, unknown>>((acc, obj) => ({ ...acc, ...(obj as Record<string, unknown>) }), {})

  const query = (body.query || nested.query || '') as string
  const topicId = (body.topic_id || body.topicId || nested.topic_id || nested.topicId || nested.topic || '') as string
  const orgId = (body.org_id || body.orgId || nested.org_id || nested.orgId || '') as string
  const mode = (body.mode || nested.mode || 'normal') as 'normal' | 'operational'
  const topK = Number(body.top_k || nested.top_k || 6)
  const similarityThreshold = Number(body.similarity_threshold || nested.similarity_threshold || 0.5)

  return {
    query: query.trim(),
    topicId: topicId.trim(),
    orgId: orgId.trim(),
    mode,
    topK: Number.isFinite(topK) ? Math.min(Math.max(topK, 1), 12) : 6,
    similarityThreshold: Number.isFinite(similarityThreshold)
      ? Math.min(Math.max(similarityThreshold, 0), 1)
      : 0.5,
  }
}

export async function POST(request: NextRequest) {
  try {
    toolLog('Incoming tool request')
    const expectedSecret = process.env.ELEVENLABS_TOOL_SECRET

    const bearer = getBearerToken(request)
    const isBearerAuthorized = !!expectedSecret && !!bearer && bearer === expectedSecret
    toolLog('Auth mode detected', {
      bearerProvided: !!bearer,
      bearerAuthorized: isBearerAuthorized,
    })

    let callerUserId: string | null = null
    if (!isBearerAuthorized) {
      // Client-tools execute in browser context, so allow authenticated same-origin users.
      const authClient = await createClient()
      const { data: { user }, error: authError } = await authClient.auth.getUser()
      if (authError || !user) {
        toolLog('Rejected unauthorized request (no session user)')
        return NextResponse.json({ error: 'Unauthorized tool request' }, { status: 401 })
      }
      callerUserId = user.id
      toolLog('Authorized via app session', { callerUserId })
    }

    const body = (await request.json()) as ToolPayload
    const { query, topicId, orgId, mode, topK, similarityThreshold } = normalizePayload(body)
    toolLog('Normalized payload', {
      topicId,
      orgId: orgId || null,
      mode,
      topK,
      similarityThreshold,
      queryPreview: query.slice(0, 120),
    })

    if (!query) {
      toolLog('Rejected request: missing query')
      return NextResponse.json({ error: 'query is required' }, { status: 400 })
    }
    if (!topicId) {
      toolLog('Rejected request: missing topic_id')
      return NextResponse.json({ error: 'topic_id (or topicId) is required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { data: topic, error: topicError } = await supabase
      .from('topics')
      .select('id, title, org_id')
      .eq('id', topicId)
      .single()

    if (topicError || !topic) {
      toolLog('Topic lookup failed', { topicId })
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 })
    }

    if (orgId && topic.org_id !== orgId) {
      toolLog('Rejected request: org mismatch', { topicOrgId: topic.org_id, providedOrgId: orgId })
      return NextResponse.json({ error: 'Topic does not belong to provided org_id' }, { status: 403 })
    }

    if (!topic.org_id) {
      toolLog('Rejected request: topic missing org_id', { topicId })
      return NextResponse.json({ error: 'Topic is missing org_id; backfill required' }, { status: 422 })
    }

    if (callerUserId) {
      const { data: caller, error: callerError } = await supabase
        .from('users')
        .select('org_id')
        .eq('id', callerUserId)
        .single()

      if (callerError || !caller?.org_id) {
        toolLog('Rejected request: caller org not found', { callerUserId })
        return NextResponse.json({ error: 'Caller organization not found' }, { status: 403 })
      }
      if (caller.org_id !== topic.org_id) {
        toolLog('Rejected request: caller org access denied', {
          callerOrgId: caller.org_id,
          topicOrgId: topic.org_id,
        })
        return NextResponse.json({ error: 'Topic access denied for current user organization' }, { status: 403 })
      }
    }

    const queryEmbedding = await generateEmbedding(query)
    toolLog('Generated query embedding', { embeddingLength: queryEmbedding.length })

    const { data: matches, error: matchError } = await supabase.rpc('match_documents_for_topic', {
      query_embedding: queryEmbedding,
      filter_org_id: topic.org_id,
      filter_topic_id: topicId,
      match_count: topK,
      similarity_threshold: similarityThreshold,
    })

    if (matchError) {
      toolLog('Vector search failed', { error: matchError.message })
      return NextResponse.json({ error: `Vector search failed: ${matchError.message}` }, { status: 500 })
    }

    const rows = (matches || []) as Array<{
      document_id: string
      similarity: number
      chunk_text: string
      chunk_index: number
      section: string | null
      updated_at: string | null
      metadata: Record<string, unknown> | null
    }>

    if (rows.length === 0) {
      toolLog('Vector search returned zero rows', { topicId })
      return NextResponse.json({
        success: true,
        topic_id: topicId,
        topic_title: topic.title,
        answer: "I couldn't find relevant information in this topic.",
        results: [],
      })
    }

    const docIds = [...new Set(rows.map((r) => r.document_id))]
    const { data: docs } = await supabase
      .from('documents')
      .select('id, title')
      .in('id', docIds)

    const docMap = new Map((docs || []).map((d) => [d.id, d.title]))

    const results = rows.map((row) => ({
      document_id: row.document_id,
      document_title: docMap.get(row.document_id) || (row.metadata?.documentTitle as string) || 'Untitled',
      similarity: row.similarity,
      section: row.section || undefined,
      updated_at: row.updated_at || undefined,
      chunk_index: row.chunk_index,
      excerpt: row.chunk_text.slice(0, mode === 'operational' ? 260 : 420),
    }))

    const answer = results
      .slice(0, mode === 'operational' ? 2 : 3)
      .map((r, idx) => `Source ${idx + 1} (${r.document_title}): ${r.excerpt}`)
      .join('\n\n')

    toolLog('Tool request success', {
      topicId,
      resultCount: results.length,
      topSimilarity: results[0]?.similarity ?? null,
    })

    return NextResponse.json({
      success: true,
      topic_id: topicId,
      topic_title: topic.title,
      answer,
      results,
    })
  } catch (error) {
    console.error('[voice-tool/search] Unhandled error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
