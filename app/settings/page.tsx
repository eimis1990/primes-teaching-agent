"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { SidebarLayout } from "@/components/layouts/sidebar-layout"
import { Settings } from "lucide-react"

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [authLoading, user, router])

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-white/60">Loading...</div>
      </div>
    )
  }

  return (
    <SidebarLayout breadcrumbs={[{ label: "Settings" }]}>
      <div className="pt-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-white tracking-tight">Settings</h1>
            <p className="text-white/40 mt-1">Manage your preferences and configuration</p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-24 h-24 bg-[#35383D] rounded-2xl flex items-center justify-center mb-6">
            <Settings className="w-12 h-12 text-white/40" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Coming Soon</h3>
          <p className="text-white/40 text-center max-w-md">
            Settings and configuration options will be available here soon.
          </p>
        </div>
      </div>
    </SidebarLayout>
  )
}
