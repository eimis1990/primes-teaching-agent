#!/usr/bin/env node

import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'

const DEFAULT_CASES_FILE = 'scripts/retrieval-eval-cases.example.json'
const DEFAULT_TOP_K = 8

function parseArgs() {
  const args = process.argv.slice(2)
  const parsed = { file: DEFAULT_CASES_FILE, topK: DEFAULT_TOP_K }
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--file' && args[i + 1]) {
      parsed.file = args[++i]
    } else if (arg === '--top-k' && args[i + 1]) {
      parsed.topK = Number(args[++i]) || DEFAULT_TOP_K
    }
  }
  return parsed
}

function keywordHit(text, keywords) {
  const lower = text.toLowerCase()
  return keywords.some((keyword) => lower.includes(keyword.toLowerCase()))
}

async function loadCases(filePath) {
  const absolute = path.resolve(process.cwd(), filePath)
  const content = await fs.readFile(absolute, 'utf8')
  const parsed = JSON.parse(content)
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(`No eval cases found in ${filePath}`)
  }
  return parsed
}

async function generateQueryEmbedding(genAI, query) {
  const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' })
  const result = await model.embedContent({
    content: { parts: [{ text: query }] },
    taskType: 'RETRIEVAL_QUERY',
    outputDimensionality: 768,
  })
  if (!result.embedding?.values) {
    throw new Error('Embedding generation failed for query')
  }
  return result.embedding.values
}

async function run() {
  const { file, topK } = parseArgs()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const geminiApiKey = process.env.GEMINI_API_KEY

  if (!supabaseUrl || !serviceRoleKey || !geminiApiKey) {
    throw new Error(
      'Missing env. Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY'
    )
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const genAI = new GoogleGenerativeAI(geminiApiKey)
  const cases = await loadCases(file)

  let hits = 0
  let reciprocalRankSum = 0
  const detailed = []

  for (const item of cases) {
    const { topic_id: topicId, query, expected_keywords: expectedKeywords } = item
    if (!topicId || !query || !Array.isArray(expectedKeywords) || expectedKeywords.length === 0) {
      throw new Error('Invalid eval case: each case needs topic_id, query, expected_keywords[]')
    }

    const { data: topic, error: topicError } = await supabase
      .from('topics')
      .select('id, org_id')
      .eq('id', topicId)
      .single()

    if (topicError || !topic?.org_id) {
      throw new Error(`Topic/org lookup failed for topic_id=${topicId}: ${topicError?.message || 'missing org_id'}`)
    }

    const embedding = await generateQueryEmbedding(genAI, query)
    const { data: rows, error: retrievalError } = await supabase.rpc('match_documents_hybrid_for_topic', {
      query_embedding: embedding,
      query_text: query,
      filter_org_id: topic.org_id,
      filter_topic_id: topic.id,
      vector_match_count: Math.max(topK * 4, 20),
      fts_match_count: Math.max(topK * 4, 20),
      final_match_count: topK,
      similarity_threshold: 0.35,
    })

    if (retrievalError) {
      throw new Error(`Retrieval failed for "${query}": ${retrievalError.message}`)
    }

    const ranked = rows || []
    const firstHitIndex = ranked.findIndex((row) => keywordHit(row.chunk_text || '', expectedKeywords))
    const hit = firstHitIndex !== -1
    const rr = hit ? 1 / (firstHitIndex + 1) : 0

    if (hit) hits += 1
    reciprocalRankSum += rr

    detailed.push({
      query,
      hit,
      firstHitRank: hit ? firstHitIndex + 1 : null,
      topPreview: ranked[0]?.chunk_text?.replace(/\s+/g, ' ').slice(0, 120) || null,
    })
  }

  const n = cases.length
  const recallAtK = hits / n
  const mrr = reciprocalRankSum / n

  console.log('Retrieval evaluation complete')
  console.log(JSON.stringify({ cases: n, topK, recallAtK, mrr, detailed }, null, 2))
}

run().catch((error) => {
  console.error('Evaluation failed:', error)
  process.exit(1)
})
