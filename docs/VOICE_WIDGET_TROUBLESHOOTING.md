# Voice Widget: Mic Permission Granted but Agent Receives No Voice

Troubleshooting guide when the ElevenLabs floating widget appears, mic button works (permission granted), but the agent doesn't respond to voice.

## 1. Exact Observed Errors (What to Inspect)

### Browser DevTools → Console

Look for:

| Error / Log | Meaning |
|------------|---------|
| `[elevenlabs/widget] Script load failed` | Widget bundle failed to load (network/CORS) |
| `[elevenlabs/widget] Mounting widget` | Widget initialized; check `agentId`, `topicId` |
| `Client tool with name search_topic_knowledge_base is not defined on client` | ElevenLabs agent configured as Client Tool instead of Server Tool |
| `WebSocket connection failed` / `WebRTC` errors | Audio stream cannot reach ElevenLabs |
| `Mixed Content` / `blocked:mixed-content` | Page served over HTTP while widget expects HTTPS |
| CORS errors on `api.elevenlabs.io` | Cross-origin blocking (rare for widget) |

### Browser DevTools → Network

- **Filter**: `Fetch/XHR` or `WS` (WebSocket)
- **When speaking**: Expect requests to `api.elevenlabs.io` / `elevenlabs.io` for audio/convai
- **After agent decides to call tool**: Expect `POST` to your webhook URL (e.g. `/api/voice/tools/search` or your configured domain)

**Critical check**: Does any request hit `localhost:3002/api/voice/tools/search` when you speak a knowledge question?

- If **yes**: Your app receives tool calls; inspect response (200 vs 4xx/5xx) and server logs.
- If **no**: ElevenLabs cloud is calling the webhook URL configured in the ElevenLabs dashboard—**localhost is not reachable from the cloud** (see Root Cause #1).

### Server Logs (Terminal)

With `ELEVENLABS_TOOL_DEBUG=true` or in development:

```
[voice-tool/search] Incoming tool request
[voice-tool/search] Auth mode detected { bearerProvided: true, bearerAuthorized: true }
```

- **No such logs when speaking** → Webhook is never called (usually because URL is localhost or unreachable).
- **401 Unauthorized** → Bearer token mismatch with `ELEVENLABS_TOOL_SECRET`.
- **404 Topic not found** → `topic_id` invalid or not in DB.
- **422 Topic is missing org_id** → Run backfill (see [BACKFILL_ORG_IDS.md](./BACKFILL_ORG_IDS.md)).

---

## 2. Likely Root Causes (Ranked)

### 1. Webhook URL points to localhost (highest likelihood)

**Symptom**: Mic works, you speak, agent may say nothing or "I couldn't access the knowledge tool right now."

**Cause**: In ElevenLabs dashboard, the Server Tool `search_topic_knowledge_base` is configured with a URL like:

- `http://localhost:3002/api/voice/tools/search`
- `http://127.0.0.1:3002/api/voice/tools/search`

ElevenLabs servers run in the cloud and **cannot reach localhost**. The webhook call fails, the agent gets no tool result, and cannot answer.

### 2. ELEVENLABS_TOOL_SECRET mismatch

**Symptom**: Webhook receives requests (you see logs) but returns 401. Agent says it cannot access the tool.

**Cause**: The Bearer token configured in the ElevenLabs tool does not match `ELEVENLABS_TOOL_SECRET` in `.env.local`.

### 3. Tool configured as Client instead of Server

**Symptom**: Console shows `Client tool with name search_topic_knowledge_base is not defined on client`.

**Cause**: In ElevenLabs, the tool is set as **Client Tool**. The widget embed does not register client tools; it expects a **Server/Webhook** tool.

### 4. Topic missing org_id or caller org mismatch

**Symptom**: 403 or 422 from webhook; server logs mention `org_id` or "Topic is missing org_id".

**Cause**: Topic was created before multi-tenant migration, or user/org mismatch. See [BACKFILL_ORG_IDS.md](./BACKFILL_ORG_IDS.md).

### 5. Widget script load failure (unpinned version)

**Symptom**: Widget does not appear, or breaks after upstream update.

**Cause**: Widget script loaded from `https://unpkg.com/@elevenlabs/convai-widget-embed` without version pin. A new release could introduce breaking changes.

### 6. HTTPS / secure context

**Symptom**: Mic permission denied or WebRTC fails on non-localhost HTTP.

**Cause**: `getUserMedia`/WebRTC often require secure context (HTTPS or localhost). Deployed HTTP (non-localhost) can block mic.

---

## 3. Concrete Fixes in Code/Config

### Fix 1: Use a tunnel for local development

**Problem**: ElevenLabs cannot reach `localhost`.

**Solution**: Expose your dev server with a public URL:

```bash
# Option A: ngrok
ngrok http 3002

# Option B: Cloudflare Tunnel
cloudflared tunnel --url http://localhost:3002
```

Then in the **ElevenLabs Dashboard** → Agent → Tools → `search_topic_knowledge_base`:

- Set URL to: `https://<your-ngrok-or-tunnel-host>/api/voice/tools/search`
- Set Header: `Authorization: Bearer <ELEVENLABS_TOOL_SECRET>`

### Fix 2: Align ELEVENLABS_TOOL_SECRET

**File**: `.env.local`

```
ELEVENLABS_TOOL_SECRET=<same-value-as-in-elevenlabs-dashboard>
```

In ElevenLabs: Tool settings → Headers → `Authorization: Bearer <secret>`. The secret must match exactly.

### Fix 3: Configure as Server Tool (not Client)

**Location**: ElevenLabs Dashboard → Agent → Tools

- **Tool type**: `Server` / `Webhook` (not Client)
- **Name**: `search_topic_knowledge_base`
- **URL**: `https://<your-domain>/api/voice/tools/search` (or tunnel URL for local)
- **Method**: POST
- **Headers**: `Authorization: Bearer <ELEVENLABS_TOOL_SECRET>`, `Content-Type: application/json`
- **Wait for response**: ON

See [ELEVENLABS_WIDGET_SERVER_TOOL_SETUP.md](./ELEVENLABS_WIDGET_SERVER_TOOL_SETUP.md) for full field mapping.

### Fix 4: Pin widget script version (code)

**File**: `components/voice/elevenlabs-floating-widget.tsx`

Already applied: script URL uses `@0.8.2`:

```ts
const WIDGET_SCRIPT_SRC = "https://unpkg.com/@elevenlabs/convai-widget-embed@0.8.2"
```

If you use `elevenlabs-topic-widget.tsx`, update its script src to match.

### Fix 5: Enable diagnostic logging

**File**: `.env.local`

```
NEXT_PUBLIC_ELEVENLABS_VOICE_DEBUG=true
ELEVENLABS_TOOL_DEBUG=true
```

Restart the dev server. Check browser console for `[elevenlabs/widget]` and server logs for `[voice-tool/search]`.

### Fix 6: Backfill org_id for existing topics

See [BACKFILL_ORG_IDS.md](./BACKFILL_ORG_IDS.md). Run migrations and backfill scripts before testing.

---

## Quick Verification Checklist

1. [ ] Open `http://localhost:3002` (or your tunnel URL)
2. [ ] Log in as admin, go to Knowledge Base → open a topic with documents
3. [ ] Confirm floating widget appears and mic button is enabled
4. [ ] Open DevTools → Console; look for `[elevenlabs/widget] Mounting widget`
5. [ ] Open DevTools → Network; filter XHR/WS
6. [ ] Speak a question (e.g. "What documents are in this topic?")
7. [ ] Check Network: any POST to `/api/voice/tools/search`?
8. [ ] Check server terminal: any `[voice-tool/search]` logs?

If steps 7–8 show **no** webhook requests, the webhook URL in ElevenLabs almost certainly points to localhost or an unreachable host. Use a tunnel (Fix 1) and update the URL in the ElevenLabs dashboard.
