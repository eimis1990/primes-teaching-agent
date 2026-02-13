import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'
import { generateEmbedding } from '@/lib/embeddings/processor'
import { GoogleGenerativeAI } from '@google/generative-ai'

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

type RetrievedRow = {
  document_id: string
  similarity: number
  chunk_text: string
  chunk_index: number
  section: string | null
  updated_at: string | null
  metadata: Record<string, unknown> | null
  vector_rank?: number | null
  fts_rank?: number | null
  lexical_score?: number | null
  rrf_score?: number | null
}

function toolDebugEnabled() {
  return process.env.ELEVENLABS_TOOL_DEBUG === 'true' || process.env.NODE_ENV !== 'production'
}

function hybridRetrievalEnabled() {
  return process.env.RAG_HYBRID_RETRIEVAL_ENABLED !== 'false'
}

function modelRerankEnabled() {
  return process.env.RAG_MODEL_RERANK_ENABLED === 'true'
}

function getModelRerankCandidateCount() {
  const value = Number(process.env.RAG_MODEL_RERANK_CANDIDATES || 20)
  return Number.isFinite(value) ? Math.min(Math.max(Math.floor(value), 5), 30) : 20
}

let rerankClient: GoogleGenerativeAI | null = null
function getRerankClient() {
  if (!process.env.GEMINI_API_KEY) return null
  if (!rerankClient) {
    rerankClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  }
  return rerankClient
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

function buildExcerpt(chunkText: string, query: string, maxLength: number): string {
  if (!chunkText) return ''
  const clean = chunkText.replace(/\s+/g, ' ').trim()
  if (clean.length <= maxLength) return clean

  const queryTerms = getExpandedQueryTerms(query)

  const lower = clean.toLowerCase()
  let anchorIndex = -1
  for (const term of queryTerms) {
    const idx = lower.indexOf(term)
    if (idx !== -1 && (anchorIndex === -1 || idx < anchorIndex)) {
      anchorIndex = idx
    }
  }

  const contextBefore = Math.floor(maxLength * 0.25)
  let start = anchorIndex === -1 ? 0 : Math.max(0, anchorIndex - contextBefore)
  if (start + maxLength > clean.length) {
    start = Math.max(0, clean.length - maxLength)
  }
  const end = Math.min(clean.length, start + maxLength)
  const excerpt = clean.slice(start, end).trim()

  const prefix = start > 0 ? '... ' : ''
  const suffix = end < clean.length ? ' ...' : ''
  return `${prefix}${excerpt}${suffix}`
}

function getExpandedQueryTerms(query: string): string[] {
  const stopwords = new Set([
    'the', 'and', 'for', 'with', 'from', 'that', 'this', 'what', 'who', 'where', 'when',
    'about', 'into', 'your', 'have', 'does', 'how', 'are', 'was', 'were', 'can', 'you',
    'tell', 'give', 'show', 'find', 'please',
  ])
  const baseTerms = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length >= 2 && !stopwords.has(term))

  const expanded = new Set(baseTerms)
  if (expanded.has('hr')) {
    expanded.add('human')
    expanded.add('resources')
    expanded.add('people')
  }
  if (expanded.has('director')) {
    expanded.add('head')
    expanded.add('lead')
    expanded.add('manager')
  }
  if (expanded.has('ceo')) {
    expanded.add('chief')
    expanded.add('executive')
    expanded.add('officer')
  }
  return [...expanded]
}

function isFactoidRoleQuery(query: string): boolean {
  const q = query.toLowerCase()
  return /(who|name)\b/.test(q) && /(director|manager|lead|head|ceo|cfo|cto|hr|human resources)/.test(q)
}

function hasRoleEvidence(text: string, query: string): boolean {
  const lower = text.toLowerCase()
  const queryTerms = getExpandedQueryTerms(query)
  const termMatches = queryTerms.filter((term) => lower.includes(term)).length
  const hasPhrase = lower.includes(query.toLowerCase())
  return hasPhrase || termMatches >= 2
}

function isFactSeekingQuery(query: string): boolean {
  const q = query.toLowerCase()
  return /\b(who|what|when|where|which|name|list|identify|how many|how much)\b/.test(q)
}

function hasStrongQueryEvidence(rows: RetrievedRow[], query: string): boolean {
  const terms = getExpandedQueryTerms(query)
  if (terms.length === 0) return rows.length > 0
  const minMatches = Math.min(2, terms.length)
  const queryText = query.toLowerCase().trim()

  return rows.some((row) => {
    const text = row.chunk_text.toLowerCase()
    const matches = terms.filter((term) => text.includes(term)).length
    const hasPhrase = queryText.length > 0 && text.includes(queryText)
    const hasSemanticSignal = row.similarity >= 0.58
    const hasLexicalSignal = (row.lexical_score ?? 0) > 0.05
    return hasPhrase || (matches >= minMatches && (hasSemanticSignal || hasLexicalSignal))
  })
}

function rankByHybridRelevance<T extends RetrievedRow>(
  rows: T[],
  query: string
): T[] {
  const queryTerms = getExpandedQueryTerms(query)

  if (queryTerms.length === 0) return rows

  const queryText = query.toLowerCase().trim()
  return [...rows]
    .map((row) => {
      const text = row.chunk_text.toLowerCase()
      const matchedTerms = queryTerms.filter((term) => text.includes(term)).length
      const lexicalCoverage = matchedTerms / queryTerms.length
      const exactPhraseBoost = queryText && text.includes(queryText) ? 1 : 0
      const lexicalScoreBoost = Math.min(Math.log1p(Math.max(row.lexical_score ?? 0, 0)), 1)
      const rrfScoreBoost = Math.min((row.rrf_score ?? 0) * 40, 1)
      // Blend semantic similarity with lexical coverage to avoid generic but semantically-close chunks.
      const hybridScore = (
        row.similarity * 0.45 +
        lexicalCoverage * 0.3 +
        exactPhraseBoost * 0.1 +
        lexicalScoreBoost * 0.05 +
        rrfScoreBoost * 0.1
      )
      return { row, hybridScore }
    })
    .sort((a, b) => b.hybridScore - a.hybridScore)
    .map((item) => item.row)
}

function safeJsonParse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T
  } catch {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start === -1 || end === -1 || end <= start) return null
    try {
      return JSON.parse(text.slice(start, end + 1)) as T
    } catch {
      return null
    }
  }
}

async function rerankWithModel(query: string, rows: RetrievedRow[]): Promise<RetrievedRow[]> {
  if (!modelRerankEnabled()) return rows
  const client = getRerankClient()
  if (!client) return rows
  if (rows.length <= 1) return rows

  const candidateCount = Math.min(rows.length, getModelRerankCandidateCount())
  const candidates = rows.slice(0, candidateCount).map((row, idx) => ({
    idx,
    similarity: Number(row.similarity.toFixed(6)),
    lexical_score: Number((row.lexical_score ?? 0).toFixed(6)),
    chunk_text: row.chunk_text.replace(/\s+/g, ' ').slice(0, 900),
  }))

  const prompt = `
You are a retrieval reranker for a RAG system.
Given a user query and candidate chunks, rank chunks by factual answer likelihood.
Prioritize chunks that directly answer the query with concrete facts.
Penalize generic topic descriptions and marketing language.
Return strict JSON only in this exact shape:
{"rankings":[{"idx":0,"score":0.93}]}
Rules:
- score is between 0 and 1
- include only provided idx values
- do not output any other keys

User query:
${query}

Candidates:
${JSON.stringify(candidates)}
`.trim()

  try {
    const model = client.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json',
      },
    })
    const result = await model.generateContent(prompt)
    const parsed = safeJsonParse<{ rankings?: Array<{ idx?: number; score?: number }> }>(result.response.text())
    const rankings = parsed?.rankings || []
    if (rankings.length === 0) return rows

    const scoreByIdx = new Map<number, number>()
    for (const item of rankings) {
      if (!Number.isInteger(item.idx)) continue
      const score = Number(item.score)
      if (!Number.isFinite(score)) continue
      if ((item.idx as number) < 0 || (item.idx as number) >= candidateCount) continue
      scoreByIdx.set(item.idx as number, Math.min(Math.max(score, 0), 1))
    }
    if (scoreByIdx.size === 0) return rows

    const rerankedHead = rows
      .slice(0, candidateCount)
      .map((row, idx) => ({ row, idx, score: scoreByIdx.get(idx) ?? -1 }))
      .sort((a, b) => b.score - a.score)
      .map((item) => item.row)

    return [...rerankedHead, ...rows.slice(candidateCount)]
  } catch {
    return rows
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

    // Try to find topic by ID (UUID) first, then by title/slug if that fails
    let topic = null
    let topicError = null
    
    // Check if topicId looks like a UUID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(topicId)
    
    if (isUUID) {
      // Look up by UUID
      const result = await supabase
        .from('topics')
        .select('id, title, org_id')
        .eq('id', topicId)
        .single()
      topic = result.data
      topicError = result.error
    }
    
    // If UUID lookup failed or topicId is not a UUID, try by title (case-insensitive)
    if (!topic) {
      toolLog('UUID lookup failed, trying title lookup', { topicId, isUUID })
      
      // Convert slug format (e.g., "primes_real_estate") to title format (e.g., "Primes Real Estate")
      const titleSearch = topicId.replace(/_/g, ' ').toLowerCase()
      
      const result = await supabase
        .from('topics')
        .select('id, title, org_id')
        .ilike('title', titleSearch)
        .single()
      
      topic = result.data
      topicError = result.error
      
      if (topic) {
        toolLog('Topic found by title', { searchTerm: titleSearch, foundTitle: topic.title, topicId: topic.id })
      }
    }

    if (topicError || !topic) {
      toolLog('Topic lookup failed', { topicId, attemptedUUID: isUUID })
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

    const queryEmbedding = await generateEmbedding(query, 'RETRIEVAL_QUERY')
    toolLog('Generated query embedding', { embeddingLength: queryEmbedding.length })

    const retrievalPoolSize = Math.min(Math.max(topK * 6, topK), 50)
    let rawMatches: RetrievedRow[] = []
    let retrievalMode: 'hybrid' | 'vector-fallback' = 'hybrid'

    if (hybridRetrievalEnabled()) {
      const { data: hybridMatches, error: hybridError } = await supabase.rpc('match_documents_hybrid_for_topic', {
        query_embedding: queryEmbedding,
        query_text: query,
        filter_org_id: topic.org_id,
        filter_topic_id: topic.id,
        vector_match_count: retrievalPoolSize,
        fts_match_count: retrievalPoolSize,
        final_match_count: retrievalPoolSize,
        similarity_threshold: Math.max(0.35, similarityThreshold - 0.05),
      })

      if (hybridError) {
        const looksLikeMissingFunction = /match_documents_hybrid_for_topic/i.test(hybridError.message)
        if (!looksLikeMissingFunction) {
          toolLog('Hybrid retrieval failed', { error: hybridError.message })
          return NextResponse.json({ error: `Hybrid retrieval failed: ${hybridError.message}` }, { status: 500 })
        }
        toolLog('Hybrid function unavailable, using vector fallback', { error: hybridError.message })
        retrievalMode = 'vector-fallback'
      } else {
        rawMatches = (hybridMatches || []) as RetrievedRow[]
      }
    } else {
      retrievalMode = 'vector-fallback'
    }

    if (retrievalMode === 'vector-fallback') {
      const { data: vectorMatches, error: vectorError } = await supabase.rpc('match_documents_for_topic', {
        query_embedding: queryEmbedding,
        filter_org_id: topic.org_id,
        filter_topic_id: topic.id, // Use the actual UUID from the topic lookup
        match_count: retrievalPoolSize,
        similarity_threshold: similarityThreshold,
      })

      if (vectorError) {
        toolLog('Vector search failed', { error: vectorError.message })
        return NextResponse.json({ error: `Vector search failed: ${vectorError.message}` }, { status: 500 })
      }
      rawMatches = ((vectorMatches || []) as RetrievedRow[]).map((row, index) => ({
        ...row,
        vector_rank: index + 1,
        fts_rank: null,
        lexical_score: null,
        rrf_score: null,
      }))
    }

    const hybridRankedRows = rankByHybridRelevance(rawMatches, query)
    const rankedRows = await rerankWithModel(query, hybridRankedRows)
    const vectorTopPreviews = [...rankedRows]
      .filter((row) => (row.vector_rank ?? Number.MAX_SAFE_INTEGER) < Number.MAX_SAFE_INTEGER)
      .sort((a, b) => (a.vector_rank ?? Number.MAX_SAFE_INTEGER) - (b.vector_rank ?? Number.MAX_SAFE_INTEGER))
      .slice(0, 3)
      .map((row) => ({
        vectorRank: row.vector_rank ?? null,
        similarity: row.similarity,
        preview: row.chunk_text.replace(/\s+/g, ' ').slice(0, 140),
      }))
    const ftsTopPreviews = [...rankedRows]
      .filter((row) => (row.fts_rank ?? Number.MAX_SAFE_INTEGER) < Number.MAX_SAFE_INTEGER)
      .sort((a, b) => (a.fts_rank ?? Number.MAX_SAFE_INTEGER) - (b.fts_rank ?? Number.MAX_SAFE_INTEGER))
      .slice(0, 3)
      .map((row) => ({
        ftsRank: row.fts_rank ?? null,
        lexicalScore: row.lexical_score ?? null,
        preview: row.chunk_text.replace(/\s+/g, ' ').slice(0, 140),
      }))
    const candidatePreviews = rankedRows.slice(0, 3).map((row) => ({
      similarity: row.similarity,
      lexicalScore: row.lexical_score ?? null,
      rrfScore: row.rrf_score ?? null,
      preview: row.chunk_text.replace(/\s+/g, ' ').slice(0, 140),
    }))

    const rows = rankedRows.slice(0, topK)

    const roleFactQuery = isFactoidRoleQuery(query)
    const factQuery = isFactSeekingQuery(query)
    const hasStrongEvidence = rows.some((row) => hasRoleEvidence(row.chunk_text, query))
    const hasStrongQueryEvidenceSignal = hasStrongQueryEvidence(rows, query)

    if (rows.length === 0) {
      toolLog('Retrieval returned zero rows', { topicId: topic.id, retrievalMode })
      return NextResponse.json({
        success: true,
        topic_id: topic.id,
        topic_title: topic.title,
        answer: "I couldn't find relevant information in this topic.",
        results: [],
      })
    }
    if (factQuery && !hasStrongQueryEvidenceSignal) {
      toolLog('Fact query has insufficient evidence in retrieved chunks', {
        topicId: topic.id,
        query,
        retrievalMode,
      })
      return NextResponse.json({
        success: true,
        topic_id: topic.id,
        topic_title: topic.title,
        answer: "I couldn't find a reliable answer in this topic.",
        message: "I couldn't find a reliable answer in this topic.",
        text: "I couldn't find a reliable answer in this topic.",
        content: "I couldn't find a reliable answer in this topic.",
        results: [],
      })
    }
    if (roleFactQuery && !hasStrongEvidence) {
      toolLog('Role fact query has no strong evidence in retrieved chunks', {
        topicId: topic.id,
        query,
      })
      return NextResponse.json({
        success: true,
        topic_id: topic.id,
        topic_title: topic.title,
        answer: "I couldn't find a reliable answer in this topic.",
        message: "I couldn't find a reliable answer in this topic.",
        text: "I couldn't find a reliable answer in this topic.",
        content: "I couldn't find a reliable answer in this topic.",
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
      excerpt: buildExcerpt(row.chunk_text, query, mode === 'operational' ? 320 : 760),
    }))

    const answer = results
      .slice(0, mode === 'operational' ? 2 : 3)
      .map((r, idx) => `Source ${idx + 1} (${r.document_title}): ${r.excerpt}`)
      .join('\n\n')

    toolLog('Tool request success', {
      topicId: topic.id,
      retrievalMode,
      modelRerankEnabled: modelRerankEnabled(),
      retrievedCount: rawMatches.length,
      resultCount: results.length,
      topSimilarity: results[0]?.similarity ?? null,
      vectorTopPreviews,
      ftsTopPreviews,
      candidatePreviews,
      answerPreview: answer.slice(0, 240),
    })

    // Return in multiple formats for compatibility with different ElevenLabs configurations
    return NextResponse.json({
      success: true,
      topic_id: topic.id,
      topic_title: topic.title,
      answer,        // Primary format: full answer with sources
      message: answer, // Alternative format: some tools expect "message"
      text: answer,    // Alternative format: some tools expect "text"
      content: answer, // Alternative format: some tools expect "content"
      results,       // Detailed results array for advanced use
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
