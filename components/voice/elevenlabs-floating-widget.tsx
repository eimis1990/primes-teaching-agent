"use client"

import { useEffect, useMemo } from "react"

const WIDGET_SCRIPT_SRC = "https://unpkg.com/@elevenlabs/convai-widget-embed"
const DEFAULT_AGENT_ID = "agent_3001kfvedcycedjax7j8a49vgrp9"
const WIDGET_ELEMENT_ID = "primes-elevenlabs-floating-widget"
const VOICE_DEBUG = process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_DEBUG === "true"

const debugWidget = (...args: unknown[]) => {
  if (process.env.NODE_ENV !== "production" || VOICE_DEBUG) {
    console.log("[elevenlabs/widget]", ...args)
  }
}

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
      debugWidget("Widget script loaded successfully")
      resolve()
    }
    script.onerror = (e) => {
      console.error("[elevenlabs/widget] Script load failed", e)
      resolve()
    }
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
        debugWidget("Widget disabled, removing existing element")
        removeExistingWidget()
        return
      }

      await ensureWidgetScriptLoaded()
      if (cancelled) return

      removeExistingWidget()

      const widget = document.createElement("elevenlabs-convai")
      widget.setAttribute("id", WIDGET_ELEMENT_ID)
      widget.setAttribute("agent-id", agentId)
      debugWidget("Mounting default ElevenLabs widget", {
        agentId,
        topicId,
        topicTitle,
        note: "No appearance overrides are applied in app code.",
      })
      document.body.appendChild(widget)
    }

    mountWidget()

    return () => {
      cancelled = true
      debugWidget("Widget effect cleanup")
    }
  }, [enabled, agentId, topicId, topicTitle])

  return null
}

