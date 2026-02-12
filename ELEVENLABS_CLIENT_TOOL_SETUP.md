# ElevenLabs Client Tool Setup (Topic-Scoped Supabase RAG)

This guide gives you copy-paste text for creating the `search_topic_knowledge_base` tool in ElevenLabs and wiring it to this app.

## Critical note for your current integration

You are currently using the embedded widget (`elevenlabs-convai`).

If you see this error:

`Client tool with name search_topic_knowledge_base is not defined on client`

it means the tool is configured as a **Client Tool** in ElevenLabs, but no SDK `clientTools` handler exists in the page runtime.

In widget mode, prefer a **Server/Webhook tool** for backend RAG calls.

## 1) `ELEVENLABS_TOOL_SECRET` - where to get it

You do not find this secret in ElevenLabs. You create it yourself.

Use one of these commands:

```bash
openssl rand -hex 32
```

or

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Then add it to your app environment:

```env
ELEVENLABS_TOOL_SECRET=<paste_generated_secret_here>
```

Use the same value in ElevenLabs when configuring auth headers for the tool call.

## 2) Important architecture note

Your current UI uses the embedded widget (`elevenlabs-convai`). For this setup, a **server tool** is the most direct approach because the widget can call your backend webhook directly.

You can still define a **client tool** in ElevenLabs, but client tools require registering a handler in code via the ElevenLabs Conversation SDK session.

Reference: [ElevenLabs Client Tools Docs](https://elevenlabs.io/docs/eleven-agents/customization/tools/client-tools)

## 3) Tool configuration text (copy/paste in ElevenLabs)

If you import via API/JSON, use `type: "client"` under `tool_config`.
Your previous error happened because the field name was `tool_type` instead of `type`.

### Tool name

`search_topic_knowledge_base`

### Tool description

`Searches the current topic knowledge base using semantic vector retrieval from Supabase. Use this for knowledge questions. Always pass the active topic_id and the user's latest question as query. If no relevant chunks are found, return that no information exists for this topic.`

### Tool behavior options

- Wait for response: **ON**
- Disable interruptions: **OFF**
- Pre-tool speech: **Auto**
- Execution mode: **Immediate**

## 4) Parameters to add

Add these parameters in the tool editor.

### Parameter 1

- Data type: `String`
- Identifier: `query`
- Required: `true`
- Value Type: `LLM Prompt`
- Description:
  `Extract the exact user question to search semantically in the knowledge base. Keep it concise and factual. Do not include filler words or assistant commentary.`

### Parameter 2

- Data type: `String`
- Identifier: `topic_id`
- Required: `true`
- Value Type: `LLM Prompt` (or Dynamic Variable if your agent UI supports it)
- Description:
  `Use the active topic/folder identifier from conversation context. If dynamic variable topic_id exists, pass it exactly. Never invent a topic id.`

### Parameter 3

- Data type: `String`
- Identifier: `mode`
- Required: `false`
- Value Type: `LLM Prompt`
- Enum values: `normal`, `operational`
- Description:
  `Use normal for detailed explanations, operational for concise actionable responses. Default to normal if user did not request brevity.`

## 5) If you use client tools with SDK (required for real client tool execution)

Register the tool in code and call your backend endpoint:

```ts
import { Conversation } from "@elevenlabs/client"

const conversation = await Conversation.startSession({
  agentId: process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID!,
  clientTools: {
    search_topic_knowledge_base: async ({ query, topic_id, mode = "normal" }) => {
      const res = await fetch("/api/voice/tools/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_ELEVENLABS_TOOL_SECRET}`,
        },
        body: JSON.stringify({ query, topic_id, mode }),
      })

      if (!res.ok) {
        return { success: false, error: "Knowledge tool request failed" }
      }

      return await res.json()
    },
  },
})
```

In this repository, this is already wired in `components/voice/elevenlabs-floating-widget.tsx`.
It starts an SDK conversation and registers `search_topic_knowledge_base` as a real client tool handler.

To enable SDK mode, set:

```env
NEXT_PUBLIC_ELEVENLABS_CLIENT_TOOLS_SDK=true
```

When this flag is `false`, the app falls back to the embedded widget mode.

## 6) If you stay on the widget embed (recommended in current project)

Configure this as a **Server Tool** webhook to:

`POST /api/voice/tools/search`

with header:

`Authorization: Bearer <ELEVENLABS_TOOL_SECRET>`

and JSON body carrying `query`, `topic_id`, optional `mode`.

Note: for browser-side client tools, avoid exposing sensitive secrets in `NEXT_PUBLIC_*` vars in production. Prefer server tools for secret-protected endpoints.

## 7) For your current setup (recommended fix)

Do this in ElevenLabs:

1. Disable or delete the `search_topic_knowledge_base` **Client Tool**.
2. Create a new tool of type **Server/Webhook** with the same name.
3. Set webhook URL to your app endpoint:
   - `https://<your-domain>/api/voice/tools/search`
4. Add header:
   - `Authorization: Bearer <ELEVENLABS_TOOL_SECRET>`
5. Keep parameters:
   - `query` (required, string)
   - `topic_id` (required, string)
   - `mode` (optional, enum: `normal`, `operational`)
6. Keep **Wait for response** enabled.

This matches widget mode and removes the "not defined on client" error.

