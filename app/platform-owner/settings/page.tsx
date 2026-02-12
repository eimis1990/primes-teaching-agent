"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { ArrowLeft, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function PlatformOwnerSettingsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [authLoading, user, router])

  useEffect(() => {
    const platformOwnerEmail = process.env.NEXT_PUBLIC_PLATFORM_OWNER_EMAIL?.toLowerCase()
    if (user && user.email?.toLowerCase() !== platformOwnerEmail) {
      router.push('/dashboard')
    }
  }, [user, router])

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-white/60">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="pt-8 px-6 md:px-12 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Platform Settings</h1>
            <p className="text-white/40 mt-2">Configure platform-wide behavior and controls</p>
          </div>
          <Button
            variant="outline"
            onClick={() => router.push('/platform-owner')}
            className="border-white/10 bg-white/5 hover:bg-white/10 text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Owner Panel
          </Button>
        </div>

        <Card className="border-white/5 bg-[#1B1C20]/90 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white text-xl">Settings</CardTitle>
            <CardDescription className="text-white/40">
              Platform settings UI is being finalized.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                <Settings className="w-8 h-8 text-white/40" />
              </div>
              <h2 className="text-white font-medium mb-2">Coming Soon</h2>
              <p className="text-white/40 text-sm max-w-lg">
                This page now loads correctly from Quick Actions. We can add advanced platform-level
                controls here next.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
