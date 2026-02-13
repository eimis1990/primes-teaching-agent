# Webhook Server Tool Testing Guide

Complete guide for testing your ElevenLabs webhook server tool locally.

## Quick Start

### 1. Start Your Dev Server

```bash
npm run dev
```

Server will start at `http://localhost:3000`

### 2. Test the Webhook Endpoint

```bash
curl -X POST http://localhost:3000/api/voice/tools/search \
  -H "Authorization: Bearer f00965da9dab190ddbf665de34fdb5357ab1ed6331f8c0ceb06deeebf5d7468b" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is the pricing model?",
    "topic_id": "YOUR_TOPIC_ID_HERE",
    "mode": "normal"
  }'
```

### 3. Check Server Logs

With `ELEVENLABS_TOOL_DEBUG=true` in your `.env.local`, you should see:

```
[voice-tool/search] Incoming tool request
[voice-tool/search] Auth mode detected { bearerProvided: true, bearerAuthorized: true }
[voice-tool/search] Normalized payload { topicId: '...', mode: 'normal', ... }
[voice-tool/search] Generated query embedding { embeddingLength: 768 }
[voice-tool/search] Tool request success { topicId: '...', resultCount: 4, topSimilarity: 0.62 }
```

## Architecture Overview

### Data Flow

```
1. Document Upload
   ↓
2. Document → Supabase (with org_id from user's profile)
   ↓
3. Embeddings Generated → document_embeddings table (with org_id)
   ↓
4. ElevenLabs Webhook Request
   ↓
5. Webhook validates topic has org_id
   ↓
6. Vector search in document_embeddings filtered by org_id + topic_id
   ↓
7. Return semantic results
```

### Key Files

- **Webhook Endpoint**: `app/api/voice/tools/search/route.ts`
- **Embedding Processor**: `lib/embeddings/processor.ts`
- **Document Creation**: `contexts/project-context.tsx`
- **Topic Creation**: `contexts/project-context.tsx`

## Common Issues

### ❌ Error: "Topic is missing org_id; backfill required"

**Cause**: Existing topics created before multi-tenant migration don't have `org_id`.

**Solution**: See [BACKFILL_ORG_IDS.md](./BACKFILL_ORG_IDS.md)

### ❌ Error: "401 Unauthorized"

**Cause**: Bearer token doesn't match `ELEVENLABS_TOOL_SECRET` in `.env.local`

**Solution**: Verify your Authorization header matches the secret

### ❌ Error: "404 Topic not found"

**Cause**: Invalid topic_id provided

**Solution**: Get a valid topic_id from your Supabase dashboard or use the app to create one

### ❌ No results returned

**Cause**: No documents uploaded to the topic, or embeddings not generated

**Solution**: 
1. Upload a document to the topic
2. Ensure embeddings are processed (check `document_embeddings` table)

## Related Documentation

- [ELEVENLABS_WIDGET_SERVER_TOOL_SETUP.md](./ELEVENLABS_WIDGET_SERVER_TOOL_SETUP.md) - ElevenLabs configuration
- [BACKFILL_ORG_IDS.md](./BACKFILL_ORG_IDS.md) - Fix missing org_id data

## Code Quality

All code follows these principles:

✅ **org_id is set correctly** when creating:
- Topics (line 131 in `contexts/project-context.tsx`)
- Documents (line 193 in `contexts/project-context.tsx`)
- Embeddings (line 221 in `lib/embeddings/processor.ts`)

✅ **Webhook validates org_id** before processing (line 129-132 in `app/api/voice/tools/search/route.ts`)

✅ **Vector search filters by org_id** for proper multi-tenancy (line 157 in `app/api/voice/tools/search/route.ts`)

The issue you encountered was purely a **data migration issue** for existing records, not a code problem. New records will always have `org_id` set properly.
