import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  getElevenLabsAgent,
  getElevenLabsAgentId,
  hashDocumentContent,
  updateElevenLabsAgentKnowledgeBase,
  uploadTopicDocumentToElevenLabs,
} from "@/lib/voice/elevenlabs-knowledge"

function isElevenLabsKbSyncEnabled() {
  return process.env.ELEVENLABS_KB_SYNC_ENABLED === "true"
}

type TopicDocument = {
  id: string
  title: string
  content: string | null
  org_id: string | null
  user_id: string | null
}

type ExistingSyncRecord = {
  document_id: string
  content_hash: string
  elevenlabs_document_id: string
  documents?: {
    title: string
  } | null
}

async function authorizeTopicSyncAccess(supabase: Awaited<ReturnType<typeof createClient>>, topicId: string) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { error: "Unauthorized", status: 401 as const }
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("org_id, role")
    .eq("id", user.id)
    .single()

  if (profileError || !profile?.org_id) {
    return { error: "User organization not found", status: 403 as const }
  }

  if (profile.role !== "admin") {
    return { error: "Only admins can sync topic knowledge", status: 403 as const }
  }

  // IMPORTANT:
  // We intentionally rely on RLS for topic/document visibility instead of hard-filtering by org_id.
  // Some existing rows can have legacy null org_id values even though they are accessible to the user.
  const { data: topic, error: topicError } = await supabase
    .from("topics")
    .select("id, title, org_id")
    .eq("id", topicId)
    .single()

  if (topicError || !topic) {
    return { error: "Topic not found or inaccessible", status: 404 as const }
  }

  return { user, profile, topic }
}

export async function POST(request: NextRequest) {
  try {
    if (!isElevenLabsKbSyncEnabled()) {
      return NextResponse.json(
        { error: "ElevenLabs knowledge-base sync is disabled" },
        { status: 503 }
      )
    }

    const supabase = await createClient()
    const { topicId } = await request.json()
    if (!topicId) {
      return NextResponse.json({ error: "topicId is required" }, { status: 400 })
    }

    const access = await authorizeTopicSyncAccess(supabase, topicId)
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }
    const { profile, topic } = access

    const { data: documents, error: documentsError } = await supabase
      .from("documents")
      .select("id, title, content, org_id, user_id")
      .eq("topic_id", topicId)
      .order("created_at", { ascending: true })

    if (documentsError) {
      return NextResponse.json({ error: documentsError.message }, { status: 500 })
    }

    const topicDocuments = (documents || []) as TopicDocument[]
    const documentsWithContent = topicDocuments.filter((doc) => !!doc.content?.trim())

    const agentId = getElevenLabsAgentId()

    const { data: existingRecords, error: existingRecordsError } = await supabase
      .from("elevenlabs_topic_documents")
      .select("document_id, content_hash, elevenlabs_document_id, documents(title)")
      .eq("topic_id", topicId)
      .eq("agent_id", agentId)

    if (existingRecordsError) {
      return NextResponse.json({ error: existingRecordsError.message }, { status: 500 })
    }

    const existingByDocumentId = new Map<string, ExistingSyncRecord>()
    for (const record of (existingRecords || []) as ExistingSyncRecord[]) {
      existingByDocumentId.set(record.document_id, record)
    }

    let uploaded = 0
    let skippedUnchanged = 0
    let skippedEmpty = topicDocuments.length - documentsWithContent.length

    for (const doc of documentsWithContent) {
      const normalizedContent = doc.content!.trim()
      const contentHash = hashDocumentContent(normalizedContent)
      const existingRecord = existingByDocumentId.get(doc.id)

      if (existingRecord && existingRecord.content_hash === contentHash) {
        skippedUnchanged++
        continue
      }

      const upload = await uploadTopicDocumentToElevenLabs({
        agentId,
        topicTitle: topic.title,
        documentId: doc.id,
        documentTitle: doc.title,
        content: normalizedContent,
      })

      const { error: upsertError } = await supabase
        .from("elevenlabs_topic_documents")
        .upsert(
          {
            // Keep sync records org-scoped; fallback to caller's org for legacy topic/doc rows.
            org_id: topic.org_id || profile.org_id,
            topic_id: topicId,
            document_id: doc.id,
            agent_id: agentId,
            elevenlabs_document_id: upload.id,
            content_hash: contentHash,
            synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "document_id,agent_id" }
        )

      if (upsertError) {
        return NextResponse.json({ error: upsertError.message }, { status: 500 })
      }

      uploaded++
    }

    // Build topic-scoped KB list and explicitly attach to the agent.
    // This is required so uploaded docs appear under the agent knowledge base and are used in conversations.
    const { data: topicMappings, error: topicMappingsError } = await supabase
      .from("elevenlabs_topic_documents")
      .select("elevenlabs_document_id, documents(title)")
      .eq("topic_id", topicId)
      .eq("agent_id", agentId)

    if (topicMappingsError) {
      return NextResponse.json({ error: topicMappingsError.message }, { status: 500 })
    }

    const knowledgeBaseEntries = (topicMappings || [])
      .filter((row: any) => !!row?.elevenlabs_document_id)
      .map((row: any) => ({
        id: row.elevenlabs_document_id,
        name: row?.documents?.title || "Topic document",
        type: "file" as const,
      }))

    await updateElevenLabsAgentKnowledgeBase(agentId, knowledgeBaseEntries)

    return NextResponse.json({
      success: true,
      topicId,
      topicTitle: topic.title,
      agentId,
      attachedKnowledgeBaseCount: knowledgeBaseEntries.length,
      totals: {
        totalDocuments: topicDocuments.length,
        processedDocuments: documentsWithContent.length,
        uploaded,
        skippedUnchanged,
        skippedEmpty,
      },
    })
  } catch (error) {
    console.error("Error syncing topic knowledge to ElevenLabs:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to sync topic knowledge",
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!isElevenLabsKbSyncEnabled()) {
      return NextResponse.json({
        success: true,
        needsSync: false,
        disabled: true,
      })
    }

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const topicId = searchParams.get("topicId")

    if (!topicId) {
      return NextResponse.json({ error: "topicId is required" }, { status: 400 })
    }

    const access = await authorizeTopicSyncAccess(supabase, topicId)
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }
    const { topic } = access

    const agentId = getElevenLabsAgentId()

    const { data: documents, error: documentsError } = await supabase
      .from("documents")
      .select("id, title, content")
      .eq("topic_id", topicId)
      .order("created_at", { ascending: true })

    if (documentsError) {
      return NextResponse.json({ error: documentsError.message }, { status: 500 })
    }

    const docsWithContent = (documents || []).filter((doc: any) => !!doc.content?.trim())

    const { data: existingRecords, error: existingRecordsError } = await supabase
      .from("elevenlabs_topic_documents")
      .select("document_id, content_hash, elevenlabs_document_id")
      .eq("topic_id", topicId)
      .eq("agent_id", agentId)

    if (existingRecordsError) {
      return NextResponse.json({ error: existingRecordsError.message }, { status: 500 })
    }

    const existingByDocumentId = new Map<string, ExistingSyncRecord>()
    for (const record of (existingRecords || []) as ExistingSyncRecord[]) {
      existingByDocumentId.set(record.document_id, record)
    }

    let staleCount = 0
    const mappedKnowledgeBaseIds = new Set<string>()
    for (const doc of docsWithContent as Array<{ id: string; content: string }>) {
      const currentHash = hashDocumentContent(doc.content.trim())
      const existing = existingByDocumentId.get(doc.id)
      if (!existing || existing.content_hash !== currentHash) {
        staleCount++
      }
      if (existing?.elevenlabs_document_id) {
        mappedKnowledgeBaseIds.add(existing.elevenlabs_document_id)
      }
    }

    // Multi-topic safety:
    // Even when docs are unchanged, we must re-attach this topic's KB if the agent is currently
    // pointing to a different topic's knowledge list.
    let needsAgentAttach = false
    try {
      const agent = await getElevenLabsAgent(agentId)
      const currentAgentKb = agent?.conversation_config?.agent?.prompt?.knowledge_base
      const currentKbIds = new Set<string>(
        Array.isArray(currentAgentKb)
          ? currentAgentKb
              .map((entry: any) => entry?.id)
              .filter((id: any) => typeof id === "string")
          : []
      )

      if (mappedKnowledgeBaseIds.size > 0) {
        if (currentKbIds.size !== mappedKnowledgeBaseIds.size) {
          needsAgentAttach = true
        } else {
          for (const id of mappedKnowledgeBaseIds) {
            if (!currentKbIds.has(id)) {
              needsAgentAttach = true
              break
            }
          }
        }
      } else if (docsWithContent.length > 0) {
        // Topic has content but no stored mapping yet; sync is needed.
        needsAgentAttach = true
      }
    } catch (error) {
      // If we cannot inspect agent state, force sync path as safe fallback.
      console.warn("Could not inspect agent KB state, forcing sync:", error)
      needsAgentAttach = true
    }

    const needsSync = staleCount > 0 || needsAgentAttach

    return NextResponse.json({
      success: true,
      topicId,
      topicTitle: topic.title,
      agentId,
      needsSync,
      needsAgentAttach,
      staleCount,
      totals: {
        totalDocuments: (documents || []).length,
        syncableDocuments: docsWithContent.length,
      },
    })
  } catch (error) {
    console.error("Error checking topic sync status:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to check topic sync status",
      },
      { status: 500 }
    )
  }
}
