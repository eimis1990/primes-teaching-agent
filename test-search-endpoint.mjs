#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Load .env.local
const envFile = readFileSync('.env.local', 'utf-8')
const env = {}
envFile.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=')
  if (key && !key.startsWith('#')) {
    env[key.trim()] = valueParts.join('=').trim()
  }
})

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
)

console.log('🔍 Checking topics in database...\n')

// Get topics
const { data: topics, error } = await supabase
  .from('topics')
  .select('id, title, org_id')
  .limit(10)

if (error) {
  console.error('❌ Error fetching topics:', error)
  process.exit(1)
}

if (!topics || topics.length === 0) {
  console.log('⚠️  No topics found in database')
  process.exit(0)
}

console.log(`✅ Found ${topics.length} topics:\n`)
topics.forEach((topic, i) => {
  console.log(`${i + 1}. "${topic.title}"`)
  console.log(`   ID: ${topic.id}`)
  console.log(`   Org ID: ${topic.org_id || '❌ MISSING'}`)
  console.log()
})

// Test the endpoint with the first topic
if (topics.length > 0) {
  const testTopic = topics[0]
  console.log(`\n🧪 Testing endpoint with topic: "${testTopic.title}"\n`)
  
  const testPayload = {
    query: "What information is available?",
    topic_id: testTopic.id,
    mode: "normal"
  }
  
  console.log('Request payload:', JSON.stringify(testPayload, null, 2))
  console.log('\nCurl command for testing:')
  console.log(`\ncurl -X POST http://localhost:3000/api/voice/tools/search \\`)
  console.log(`  -H "Authorization: Bearer ${env.ELEVENLABS_TOOL_SECRET}" \\`)
  console.log(`  -H "Content-Type: application/json" \\`)
  console.log(`  -d '${JSON.stringify(testPayload)}'`)
  
  console.log(`\nNgrok URL (for ElevenLabs):`)
  console.log(`https://nonimaginational-sun-imino.ngrok-free.dev/api/voice/tools/search`)
  console.log(`\nFor ElevenLabs configuration, use topic_id: ${testTopic.id}`)
  console.log(`Or you can use the title: "${testTopic.title}"`)
}
