"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Mic } from "lucide-react"

const WIDGET_SCRIPT_SRC = "https://unpkg.com/@elevenlabs/convai-widget-embed"
const DEFAULT_AGENT_ID = "agent_3001kfvedcycedjax7j8a49vgrp9"
const VOICE_DEBUG = process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_DEBUG === "true"

const debugWidget = (...args: unknown[]) => {
  if (process.env.NODE_ENV !== "production" || VOICE_DEBUG) {
    console.log("[elevenlabs/topic-widget]", ...args)
  }
}

async function ensureWidgetScriptLoaded(): Promise<void> {
  if (typeof window === "undefined") return

  const existing = document.querySelector(`script[src="${WIDGET_SCRIPT_SRC}"]`) as HTMLScriptElement | null
  if (existing) {
    if (existing.dataset.loaded === "true") return
    await new Promise<void>((resolve) => {
      existing.addEventListener("load", () => {
        existing.dataset.loaded = "true"
        resolve()
      }, { once: true })
      existing.addEventListener("error", () => resolve(), { once: true })
    })
    return
  }

  await new Promise<void>((resolve) => {
    const script = document.createElement("script")
    script.src = WIDGET_SCRIPT_SRC
    script.async = true
    script.type = "text/javascript"
    script.dataset.loaded = "false"
    script.onload = () => {
      script.dataset.loaded = "true"
      debugWidget("Widget script loaded successfully")
      resolve()
    }
    script.onerror = (e) => {
      console.error("[elevenlabs/topic-widget] Script load failed", e)
      resolve()
    }
    document.body.appendChild(script)
  })
}

interface ElevenLabsTopicWidgetProps {
  topicId: string
  topicTitle: string
  documentCount: number
  onSyncStateChange?: (state: "idle" | "syncing" | "synced" | "failed") => void
}

export function ElevenLabsTopicWidget({
  topicId,
  topicTitle,
  documentCount,
  onSyncStateChange,
}: ElevenLabsTopicWidgetProps) {
  const widgetHostRef = useRef<HTMLDivElement | null>(null)
  const syncKeyRef = useRef<string | null>(null)
  const [syncState, setSyncState] = useState<"idle" | "syncing" | "synced" | "failed">("idle")
  const [renderSeed, setRenderSeed] = useState(0)

  const agentId = useMemo(
    () => process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || DEFAULT_AGENT_ID,
    []
  )

  const syncTopicKnowledge = async () => {
    setSyncState("syncing")
    onSyncStateChange?.("syncing")

    try {
      const response = await fetch("/api/voice/sync-topic", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ topicId }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || "Failed to sync topic knowledge")
      }

      setSyncState("synced")
      onSyncStateChange?.("synced")
      setRenderSeed((prev) => prev + 1)
    } catch (error) {
      console.error("ElevenLabs topic sync failed:", error)
      setSyncState("failed")
      onSyncStateChange?.("failed")
    } finally {
      // no-op
    }
  }

  useEffect(() => {
    // Run sync in background on topic entry and when doc count changes.
    // This avoids requiring manual sync interaction.
    if (!topicId || documentCount <= 0) {
      setSyncState("idle")
      onSyncStateChange?.("idle")
      return
    }

    const currentSyncKey = `${topicId}:${documentCount}`
    if (syncKeyRef.current === currentSyncKey) return

    syncKeyRef.current = currentSyncKey
    syncTopicKnowledge()
  }, [topicId, documentCount])

  useEffect(() => {
    if (syncState !== "synced") return

    let cancelled = false

    const renderWidget = async () => {
      if (!widgetHostRef.current) return

      await ensureWidgetScriptLoaded()
      if (cancelled || !widgetHostRef.current) return

      widgetHostRef.current.innerHTML = ""
      const widget = document.createElement("elevenlabs-convai")

      widget.setAttribute("agent-id", agentId)
      debugWidget("Mounting default ElevenLabs widget", { agentId, topicId, topicTitle })

      widgetHostRef.current.appendChild(widget)
    }

    renderWidget()
    return () => {
      cancelled = true
    }
  }, [agentId, topicId, topicTitle, renderSeed, syncState])

  // Do not show the widget when sync failed or hasn't completed.
  if (syncState !== "synced") {
    return null
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#1B1C20] via-[#17181B] to-[#131417] p-5 md:p-6">
      <div className="mb-4">
        <h3 className="text-base md:text-lg font-semibold text-white flex items-center gap-2">
          <Mic size={18} className="text-[#F34A23]" />
          ElevenLabs Voice Assistant
        </h3>
        <p className="text-sm text-white/50 mt-1">
          Topic-scoped assistant is automatically synced in the background.
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/20 p-3">
        <div ref={widgetHostRef} />
      </div>
    </section>
  )
}
