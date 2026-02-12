"use client"

import { useEffect, useMemo } from "react"

const WIDGET_SCRIPT_SRC = "https://unpkg.com/@elevenlabs/convai-widget-embed"
const DEFAULT_AGENT_ID = "agent_3001kfvedcycedjax7j8a49vgrp9"
const WIDGET_ELEMENT_ID = "primes-elevenlabs-floating-widget"

async function ensureWidgetScriptLoaded(): Promise<void> {
  if (typeof window === "undefined") return

  const existing = document.querySelector(`script[src="${WIDGET_SCRIPT_SRC}"]`) as HTMLScriptElement | null
  if (existing) {
    if (existing.dataset.loaded === "true") return
    await new Promise<void>((resolve) => {
      existing.addEventListener(
        "load",
        () => {
          existing.dataset.loaded = "true"
          resolve()
        },
        { once: true }
      )
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
      resolve()
    }
    script.onerror = () => resolve()
    document.body.appendChild(script)
  })
}

interface ElevenLabsFloatingWidgetProps {
  enabled: boolean
  topicId: string
  topicTitle: string
}

export function ElevenLabsFloatingWidget({ enabled, topicId, topicTitle }: ElevenLabsFloatingWidgetProps) {
  const agentId = useMemo(
    () => process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || DEFAULT_AGENT_ID,
    []
  )

  useEffect(() => {
    let cancelled = false

    const removeExistingWidget = () => {
      const existingWidget = document.getElementById(WIDGET_ELEMENT_ID)
      if (existingWidget?.parentNode) {
        existingWidget.parentNode.removeChild(existingWidget)
      }
    }

    const mountWidget = async () => {
      if (!enabled) {
        removeExistingWidget()
        return
      }

      await ensureWidgetScriptLoaded()
      if (cancelled) return

      removeExistingWidget()

      const widget = document.createElement("elevenlabs-convai")
      widget.setAttribute("id", WIDGET_ELEMENT_ID)
      widget.setAttribute("agent-id", agentId)
      // Runtime overrides: enforce a consistent compact appearance from app code.
      widget.setAttribute("variant", "compact")
      widget.setAttribute("expandable", "always")
      widget.setAttribute("action-text", "Ask Questions")
      widget.setAttribute("dynamic-variables", JSON.stringify({
        topic_id: topicId,
        topic_title: topicTitle,
      }))
      widget.setAttribute(
        "override-prompt",
        `You are assisting with the topic "${topicTitle}". Focus only on content from this topic's documents and politely decline unrelated topics.`
      )
      widget.setAttribute(
        "override-first-message",
        `Hi. I can help with "${topicTitle}". Ask me anything about this topic.`
      )
      document.body.appendChild(widget)
    }

    mountWidget()

    return () => {
      cancelled = true
    }
  }, [enabled, agentId, topicId, topicTitle])

  return null
}

