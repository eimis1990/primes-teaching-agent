# ElevenLabs Tool Configuration - Quick Reference

## ⚠️ Your Current Issue

**Problem**: ElevenLabs is sending `topic_id: 'real_estate_policies'` but that doesn't exist in your database.

**Solution**: Use one of these valid topic IDs from your database:

```
44c33ceb-c218-405a-855b-a91156b4f6af  ← "Primes Real Estate" (use this for HR/company info)
20317d46-6e30-4b76-855c-9102ff5343f7  ← "Primes MVP"
ad924d89-5dc3-4740-8004-b100e1f3ae55  ← "Testing ONE"
ae12ee7f-efb8-4075-9754-684b9b9c2580  ← "Another Test"
979e9ff7-5baa-4b5a-8955-be62f5d24199  ← "bbb"
```

## 🔧 ElevenLabs Tool Configuration

Copy these exact values into your ElevenLabs tool configuration:

### Basic Settings
- **Tool type**: `Server` / `Webhook`
- **Name**: `search_topic_knowledge_base`
- **Wait for response**: `ON` ✅ (CRITICAL!)
- **Execution mode**: `Immediate`

### Description
```
Searches the knowledge base for the current topic using semantic search. 
ALWAYS call this tool before answering any factual questions about the topic.
The tool returns relevant document excerpts with sources.
Use the returned information to provide accurate, well-sourced answers.
```

### Webhook Settings
- **Method**: `POST`
- **URL**: `https://nonimaginational-sun-imino.ngrok-free.dev/api/voice/tools/search`
- **Headers**:
  - `Authorization: Bearer f00965da9dab190ddbf665de34fdb5357ab1ed6331f8c0ceb06deeebf5d7468b`
  - `Content-Type: application/json`

### Parameter 1: query
- **Type**: `String`
- **Required**: `true`
- **Description**: 
  ```
  The user's question or search query. Extract the key information need from the conversation.
  ```

### Parameter 2: topic_id
- **Type**: `String`
- **Required**: `true`
- **Description**: 
  ```
  The UUID of the knowledge base topic to search. Must be a valid topic ID (e.g., "44c33ceb-c218-405a-855b-a91156b4f6af"). 
  Get this from conversation context or dynamic variables. Never hardcode or guess the topic ID.
  ```
- **⚠️ IMPORTANT**: Use UUID format like `44c33ceb-c218-405a-855b-a91156b4f6af`
- **❌ DON'T USE**: Slugs like `real_estate_policies` or `primes_real_estate`

### Parameter 3: mode
- **Type**: `String`
- **Required**: `false`
- **Enum**: `normal`, `operational`
- **Description**: 
  ```
  Response verbosity level: "normal" for detailed answers with full context, "operational" for concise actionable answers.
  ```

### Request Body
```json
{
  "query": "{{query}}",
  "topic_id": "{{topic_id}}",
  "mode": "{{mode}}"
}
```

## 🎯 How to Set topic_id in ElevenLabs

### Option A: Hardcode for single topic (simplest for testing)
If you're only using one topic, set the default value to:
```
44c33ceb-c218-405a-855b-a91156b4f6af
```

### Option B: Use Dynamic Variables (for multiple topics)
1. Create a conversation variable called `topic_id`
2. Set it at the start of the conversation
3. Reference it in the tool parameter: `{{topic_id}}`

### Option C: From First Message (if supported)
Configure ElevenLabs to extract topic_id from the widget initialization parameters.

## ✅ Testing Your Configuration

After updating ElevenLabs, watch your server logs. You should see:

```
[voice-tool/search] Incoming tool request
[voice-tool/search] Normalized payload {
  topicId: '44c33ceb-c218-405a-855b-a91156b4f6af',  ← Should be a UUID now
  orgId: null,
  mode: 'normal',
  topK: 6,
  similarityThreshold: 0.5,
  queryPreview: 'Who is the HR director?'
}
[voice-tool/search] Tool request success { resultCount: 3 }
POST /api/voice/tools/search 200
```

## 🚫 Common Mistakes

❌ **Wrong**: `topic_id: "real_estate_policies"`
✅ **Correct**: `topic_id: "44c33ceb-c218-405a-855b-a91156b4f6af"`

❌ **Wrong**: `topic_id: "primes_real_estate"`
✅ **Correct**: `topic_id: "44c33ceb-c218-405a-855b-a91156b4f6af"`

❌ **Wrong**: `topic_id: "Primes Real Estate"` (this works but UUID is better)
✅ **Correct**: `topic_id: "44c33ceb-c218-405a-855b-a91156b4f6af"`

## 📝 Output Configuration (CRITICAL!)

After the tool returns results, tell ElevenLabs which field to read:

1. Look for "Output parameters" or "Response Body" section in your tool config
2. Add an output parameter:
   - **Name**: `answer`
   - **Type**: `String`
   - **Description**: `Search results with source citations`

If no Output section exists, update your Agent System Prompt:
```
IMPORTANT: When you call the search_topic_knowledge_base tool, it returns 
JSON with an 'answer' field containing relevant information from documents.
You MUST read the 'answer' field and use that information to respond to 
the user. Never say you don't have information if the tool returns results.
```

## 🔄 No Server Restart Needed

The issue is in ElevenLabs configuration, not your server. Your server is running correctly!
Just update the `topic_id` parameter in ElevenLabs to use the UUID above.
