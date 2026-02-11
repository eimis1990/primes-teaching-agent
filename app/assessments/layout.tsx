"use client"

import { Toaster } from "sonner"

export default function AssessmentsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: "#1B1C20",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            color: "#fff",
            borderRadius: "12px",
          },
        }}
      />
      {children}
    </>
  )
}
