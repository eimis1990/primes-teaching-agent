"use client"

import type React from "react"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      style={
        {
          "--normal-bg": "#222222",
          "--normal-text": "#f5f5f5",
          "--normal-border": "#333333",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
