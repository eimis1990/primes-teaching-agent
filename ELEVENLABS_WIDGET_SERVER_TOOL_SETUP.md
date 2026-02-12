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
  `Searches the active topic knowledge base using semantic retrieval in Supabase. Use before answering factual real-estate questions.`
- Wait for response: `ON`
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
  `The user's question rewritten as a precise semantic search query.`

### `topic_id`
- Type: `String`
- Required: `true`
- Description:
  `Active topic id from dynamic variables. Use current topic_id exactly and never guess.`

### `mode`
- Type: `String`
- Required: `false`
- Enum: `normal`, `operational`
- Description:
  `normal for detailed answers, operational for concise actionable answers.`

## Body mapping

Map request body to:

```json
{
  "query": "{{query}}",
  "topic_id": "{{topic_id}}",
  "mode": "{{mode}}"
}
```

## Required app env

- `ELEVENLABS_TOOL_SECRET=...`
- `ELEVENLABS_KB_SYNC_ENABLED=false` (already set in your app for now)

## Quick verification

1. Ask question in widget.
2. Check server logs for:
   - `[voice-tool/search] Incoming tool request`
3. If not present, tool is not being invoked by ElevenLabs.

