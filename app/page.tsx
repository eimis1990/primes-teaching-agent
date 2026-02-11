"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"

export default function HomePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace('/login')
      } else {
        router.replace('/dashboard')
      }
    }
  }, [authLoading, user, router])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-white/60">Loading...</div>
    </div>
  )
}
