# ElevenLabs Widget + Server Tool (Recommended)

Use this when you run `elevenlabs-convai` widget in the app and want Supabase semantic RAG from your backend.

## Why this is needed

In widget mode, a Client Tool requires a frontend SDK `clientTools` handler.  
Without that handler, ElevenLabs shows:

`Client tool with name search_topic_knowledge_base is not defined on client`

So for widget mode, configure a **Server/Webhook tool** instead.

## Tool configuration (field-by-field)

- Tool type: `Server` / `Webhook`
- Name: `search_topic_knowledge_base`
- Description:
  ```
  Searches the knowledge base for the current topic using semantic search. 
  ALWAYS call this tool before answering any factual questions about the topic.
  The tool returns relevant document excerpts with sources.
  Use the returned information to provide accurate, well-sourced answers.
  ```
- Wait for response: `ON` ✅ (Critical - agent must wait for results)
- Disable interruptions: `OFF`
- Execution mode: `Immediate`

## Webhook settings

- Method: `POST`
- URL: `https://<your-domain>/api/voice/tools/search`
- Headers:
  - `Authorization: Bearer <ELEVENLABS_TOOL_SECRET>`
  - `Content-Type: application/json`

## Parameters

### `query`
- Type: `String`
- Required: `true`
- Description:
  ```
  The user's question or search query. Extract the key information need from the conversation.
  ```

### `topic_id`
- Type: `String`
- Required: `true`
- Description:
  ```
  The UUID of the knowledge base topic to search. Must be a valid topic ID (e.g., "44c33ceb-c218-405a-855b-a91156b4f6af"). 
  Get this from conversation context or dynamic variables. Never hardcode or guess the topic ID.
  ```
- **CRITICAL**: Use the actual UUID from your database, not a slug or descriptive name like "real_estate_policies"

### `mode`
- Type: `String`
- Required: `false`
- Enum: `normal`, `operational`
- Description:
  ```
  Response verbosity level: "normal" for detailed answers with full context, "operational" for concise actionable answers.
  ```

## Request Body Mapping

Map request body to:

```json
{
  "query": "{{query}}",
  "topic_id": "{{topic_id}}",
  "mode": "{{mode}}"
}
```

### Example with Real Values

```json
{
  "query": "Who is the HR director?",
  "topic_id": "44c33ceb-c218-405a-855b-a91156b4f6af",
  "mode": "normal"
}
```

**Important**: The `topic_id` must be a UUID from your database. Run `node test-search-endpoint.mjs` to see all available topic IDs.

## Response Format

The webhook returns multiple formats for compatibility:
```json
{
  "success": true,
  "topic_id": "44c33ceb-c218-405a-855b-a91156b4f6af",
  "topic_title": "Primes Real Estate",
  "answer": "Source 1 (...): excerpt\n\nSource 2 (...): excerpt",
  "message": "Source 1 (...): excerpt\n\nSource 2 (...): excerpt",
  "text": "Source 1 (...): excerpt\n\nSource 2 (...): excerpt",
  "content": "Source 1 (...): excerpt\n\nSource 2 (...): excerpt",
  "results": [...]
}
```

**Why multiple fields?** Different ElevenLabs configurations may expect different field names. All four fields (`answer`, `message`, `text`, `content`) contain the same formatted response.

## Output Configuration in ElevenLabs (CRITICAL!)

⚠️ **This step is required for the agent to use the results!**

### Option A: If you see an "Output" or "Response Body" section:

Add an output parameter:
- **Identifier**: `answer` (or `message`, `text`, or `content`)
- **Type**: String
- **Description**: "Search results with source citations"
- **Path/Mapping** (if asked): `answer` or `$.answer`

### Option B: If no Output section exists:

Update your **Agent System Prompt** to include:
```
When you use the search_topic_knowledge_base tool, the tool returns relevant 
information in the 'answer' field. ALWAYS read and use this information to 
respond to the user's question. Incorporate the returned sources and excerpts 
into your response.
```

### Option C: If still not working:

Check if there's a "Tool Response Format" setting and try these values:
- `{answer}` or `{{answer}}`
- `{message}` or `{{message}}`
- `{text}` or `{{text}}`

## Getting Your Topic IDs

Before configuring the tool in ElevenLabs, you need to know your topic UUIDs. Run this command in your project:

```bash
node test-search-endpoint.mjs
```

This will show all available topics with their UUIDs. Example output:
```
✅ Found 5 topics:

1. "Primes Real Estate"
   ID: 44c33ceb-c218-405a-855b-a91156b4f6af
   
2. "Primes MVP"
   ID: 20317d46-6e30-4b76-855c-9102ff5343f7
```

Use these UUIDs in your ElevenLabs configuration.

## Required app env

- `ELEVENLABS_TOOL_SECRET=...`
- `ELEVENLABS_KB_SYNC_ENABLED=false` (already set in your app for now)
- `RAG_HYBRID_RETRIEVAL_ENABLED=true` (set `false` for temporary rollback to vector-only retrieval)
- `RAG_MODEL_RERANK_ENABLED=true` (enables LLM reranker on top hybrid results)
- `RAG_MODEL_RERANK_CANDIDATES=20` (optional; default 20, recommended 15-25)

## Hybrid rollout checklist (safe production rollout)

1. Apply Supabase migrations (including hybrid retrieval migration).
2. Set `RAG_HYBRID_RETRIEVAL_ENABLED=true` in app environment.
3. Restart the app server.
4. Reprocess embeddings for affected topics (chunking policy updates require re-embedding).
5. Validate with at least 10 representative factual queries per topic.
6. Keep feature flag ready for rollback (`RAG_HYBRID_RETRIEVAL_ENABLED=false`) if issues appear.
7. If tiny/short fact queries still miss, enable model reranker (`RAG_MODEL_RERANK_ENABLED=true`).

## Feature-flag validation flow

Use A/B checks in local or staging:

1. **Hybrid ON**
   - Set `RAG_HYBRID_RETRIEVAL_ENABLED=true`
   - Ask the same fixed query set
   - Save logs for:
     - `retrievalMode`
     - `vectorTopPreviews`
     - `ftsTopPreviews`
     - `candidatePreviews`
2. **Hybrid OFF**
   - Set `RAG_HYBRID_RETRIEVAL_ENABLED=false`
   - Repeat the same queries
3. Compare:
   - exact-fact hit rate
   - false-positive rate (generic snippets for factoid questions)
   - abstention quality ("couldn't find a reliable answer" only when evidence is weak)
   - improvement when `RAG_MODEL_RERANK_ENABLED=true` vs `false`

## Model reranker notes (for short/factoid misses)

When enabled, the route asks Gemini to rerank top retrieval candidates by direct answer likelihood.
This helps on short queries like names, titles, phone numbers, and one-line facts where pure embedding similarity can over-rank generic chunks.

Rollout recommendation:
1. Start with `RAG_MODEL_RERANK_ENABLED=true` in staging.
2. Keep `RAG_MODEL_RERANK_CANDIDATES` at `20` first.
3. If latency is too high, lower to `12-15`.
4. If recall is still weak on complex corpora, increase to `25`.

## Retrieval evaluation benchmark (recall/MRR)

Use the built-in benchmark script:

```bash
# 1) Copy example cases and edit with real topic IDs and expected keywords
cp scripts/retrieval-eval-cases.example.json scripts/retrieval-eval-cases.json

# 2) Run evaluation (top-k configurable)
npm run eval:retrieval -- --file scripts/retrieval-eval-cases.json --top-k 8
```

Outputs:
- `recallAtK`: percentage of queries where expected evidence is retrieved in top-k.
- `mrr`: mean reciprocal rank of first relevant hit (higher is better).
- per-query diagnostic preview to spot ranking errors quickly.

## Quick verification

1. Ask question in widget.
2. Check server logs for:
   - `[voice-tool/search] Incoming tool request`
   - `[voice-tool/search] Tool request success` with `answerPreview`
3. If not present, tool is not being invoked by ElevenLabs.
4. If `answerPreview` does not contain the expected fact, retrieval found related chunks but not the exact answer text. Add/adjust source docs or re-index and test again.

## Common Issues

### Issue 1: Agent says "information not available" even though webhook returns results ⚠️ MOST COMMON

**Symptoms:**
- ✅ Webhook logs show `200 OK` with `resultCount: 4` 
- ✅ High similarity scores (0.6+)
- ❌ Agent says "I don't have that information"

**Root Cause:** ElevenLabs agent receives the JSON but doesn't know which field contains the answer.

**Step-by-Step Fix:**

1. **Check for "Output" or "Response Body" Section**
   - In your ElevenLabs tool config, scroll down below "Body parameters"
   - Look for sections named:
     - "Output parameters" or
     - "Response body" or  
     - "Response mapping" or
     - "Tool output"

2. **Add Output Parameter** (if section exists):
   ```
   Name/Identifier: answer
   Type: String
   Description: The formatted search results with sources that the agent should use
   ```

3. **Update Agent System Prompt** (if no Output section):
   
   Go to your Agent settings and add this to the system prompt:
   ```
   IMPORTANT: When you call the search_topic_knowledge_base tool, it returns 
   JSON with an 'answer' field containing relevant information from documents.
   You MUST read the 'answer' field and use that information to respond to 
   the user. Never say you don't have information if the tool returns results.
   
   Example tool response:
   {"answer": "Source 1 (doc.pdf): The HR director is John Doe..."}
   
   In this case, you should tell the user about John Doe based on the returned answer.
   ```

4. **Test Immediately** - Ask the agent a question and watch your logs for:
   ```
   [voice-tool/search] Tool request success { resultCount: 4 }
   POST /api/voice/tools/search 200
   ```
   
   If you see this but agent still says "no information", the Output configuration is definitely the issue.

### Issue 1B: Tool returns generic company text instead of exact answer

**Symptoms:**
- ✅ `Tool request success` appears
- ✅ `resultCount > 0`
- ❌ `answerPreview` shows unrelated/generic snippets

**Meaning:** Retrieval is working, but ranking/chunk quality is not precise enough for the question.

**What to do:**

1. **Restart dev server** after retrieval code changes.
2. **Reprocess embeddings** for the topic (`Re-process` in project UI) so all documents are indexed consistently.
3. **Check whether the fact exists in indexed chunks** (Supabase SQL):
   ```sql
   SELECT d.title, de.chunk_index, LEFT(de.chunk_text, 240) AS preview
   FROM document_embeddings de
   JOIN documents d ON d.id = de.document_id
   WHERE de.topic_id = '44c33ceb-c218-405a-855b-a91156b4f6af'
     AND (
       de.chunk_text ILIKE '%hr director%'
       OR de.chunk_text ILIKE '%human resources%'
       OR de.chunk_text ILIKE '%director%'
     )
   ORDER BY de.chunk_index;
   ```
4. If no rows contain the needed fact, add/update the source document and reprocess.
5. If rows contain the fact but it is still not top-ranked, lower chunk size and use hybrid retrieval + reranking (see best-practice notes below).

### Retrieval Best Practices (Production)

For reliable factual Q&A, use this stack:
- **Query embeddings:** `RETRIEVAL_QUERY` for user queries, `RETRIEVAL_DOCUMENT` for document chunks.
- **Chunking:** sentence-aware chunks around **300-500 tokens** with 10-20% overlap.
- **Hybrid retrieval:** semantic vector search + lexical BM25/keyword search.
- **Reranking:** re-rank top candidates with lexical coverage or a cross-encoder reranker.
- **Abstention guardrail:** if no evidence chunk contains the target fact, return "not found in this topic" instead of guessing.

### Issue 2: Error "Topic is missing org_id; backfill required"

This happens when topics in your database don't have `org_id` set (usually from data created before multi-tenant migration).

**Fix:** See [BACKFILL_ORG_IDS.md](./BACKFILL_ORG_IDS.md) for instructions on how to backfill existing data.

### Issue 3: "Topic not found" error

**Symptoms:**
- Logs show `topicId: 'real_estate_policies'` or similar
- Error: `{"error":"Topic not found"}`
- Server logs: `[voice-tool/search] Topic lookup failed`

**Cause:** The `topic_id` being sent from ElevenLabs doesn't match any topic in your database.

**Fix:**

1. **Check what's being sent** - Look at server logs for the `topicId` value
2. **Get your actual topic IDs**:
   ```bash
   node test-search-endpoint.mjs
   ```
3. **Update ElevenLabs configuration** with the correct UUID (e.g., `44c33ceb-c218-405a-855b-a91156b4f6af`)
4. **Common mistakes**:
   - ❌ Using descriptive names like `real_estate_policies` 
   - ❌ Using slugs like `primes_real_estate`
   - ✅ Use actual UUID from database: `44c33ceb-c218-405a-855b-a91156b4f6af`
   - ✅ Or use exact title (case-insensitive): `Primes Real Estate`

### Debugging Steps:

1. **Get your topic IDs** (if you don't have them):
   ```bash
   node test-search-endpoint.mjs
   ```

2. **Test locally** (replace with your actual topic UUID):
   ```bash
   curl -X POST http://localhost:3000/api/voice/tools/search \
     -H "Authorization: Bearer f00965da9dab190ddbf665de34fdb5357ab1ed6331f8c0ceb06deeebf5d7468b" \
     -H "Content-Type: application/json" \
     -d '{
       "query": "What information is available?",
       "topic_id": "44c33ceb-c218-405a-855b-a91156b4f6af",
       "mode": "normal"
     }'
   ```

3. **Check server logs** for:
   ```
   [voice-tool/search] Normalized payload { topicId: '...', ... }
   [voice-tool/search] Topic lookup failed  <- If you see this, wrong topic_id
   [voice-tool/search] Tool request success <- If you see this, it's working!
   ```

4. **Verify the topicId in logs matches your database** - If logs show `topicId: 'real_estate_policies'` but your database has `44c33ceb-...`, update ElevenLabs configuration.

