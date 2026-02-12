import { createHash } from "crypto"

const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1"
const DEFAULT_AGENT_ID = "agent_3001kfvedcycedjax7j8a49vgrp9"

export function getElevenLabsAgentId(): string {
  return process.env.ELEVENLABS_AGENT_ID || process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || DEFAULT_AGENT_ID
}

function getElevenLabsApiKey(): string {
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY is not configured")
  }
  return apiKey
}

export function hashDocumentContent(content: string): string {
  return createHash("sha256").update(content).digest("hex")
}

type ElevenLabsKnowledgeEntry = {
  id: string
  name: string
  type: "file" | "text" | "url"
}

function buildKnowledgeFileName(topicTitle: string, documentTitle: string, documentId: string): string {
  const safeTopic = topicTitle.replace(/[^\w\- ]/g, "").trim().slice(0, 40) || "topic"
  const safeTitle = documentTitle.replace(/[^\w\- ]/g, "").trim().slice(0, 60) || "document"
  return `${safeTopic} :: ${safeTitle} :: ${documentId.slice(0, 8)}`
}

export async function uploadTopicDocumentToElevenLabs(params: {
  agentId: string
  topicTitle: string
  documentId: string
  documentTitle: string
  content: string
}): Promise<{ id: string; name: string }> {
  const apiKey = getElevenLabsApiKey()
  const { agentId, topicTitle, documentId, documentTitle, content } = params

  const formData = new FormData()
  formData.append("name", buildKnowledgeFileName(topicTitle, documentTitle, documentId))
  formData.append(
    "file",
    new Blob([content], { type: "text/plain" }),
    `${documentId}.txt`
  )

  const response = await fetch(
    `${ELEVENLABS_BASE_URL}/convai/knowledge-base?agent_id=${encodeURIComponent(agentId)}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
      },
      body: formData,
    }
  )

  if (!response.ok) {
    const raw = await response.text()
    throw new Error(`ElevenLabs knowledge upload failed (${response.status}): ${raw}`)
  }

  const data = await response.json()
  if (!data?.id) {
    throw new Error("ElevenLabs knowledge upload succeeded but response did not include document id")
  }

  return {
    id: data.id,
    name: data.name || documentTitle,
  }
}

export async function getElevenLabsAgent(agentId: string): Promise<any> {
  const apiKey = getElevenLabsApiKey()
  const response = await fetch(`${ELEVENLABS_BASE_URL}/convai/agents/${encodeURIComponent(agentId)}`, {
    method: "GET",
    headers: {
      "xi-api-key": apiKey,
    },
  })

  if (!response.ok) {
    const raw = await response.text()
    throw new Error(`Failed to fetch ElevenLabs agent (${response.status}): ${raw}`)
  }

  return response.json()
}

export async function updateElevenLabsAgentKnowledgeBase(
  agentId: string,
  knowledgeBase: ElevenLabsKnowledgeEntry[]
): Promise<void> {
  const apiKey = getElevenLabsApiKey()
  const currentAgent = await getElevenLabsAgent(agentId)
  const currentConversationConfig = currentAgent?.conversation_config || {}
  const currentAgentConfig = currentConversationConfig?.agent || {}
  const currentPrompt = currentAgentConfig?.prompt || {}

  const response = await fetch(`${ELEVENLABS_BASE_URL}/convai/agents/${encodeURIComponent(agentId)}`, {
    method: "PATCH",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      conversation_config: {
        ...currentConversationConfig,
        agent: {
          ...currentAgentConfig,
          prompt: {
            ...currentPrompt,
            knowledge_base: knowledgeBase,
          },
        },
      },
    }),
  })

  if (!response.ok) {
    const raw = await response.text()
    throw new Error(`Failed to attach knowledge base to agent (${response.status}): ${raw}`)
  }
}
