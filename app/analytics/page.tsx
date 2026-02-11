"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { SidebarLayout } from "@/components/layouts/sidebar-layout"
import { BarChart2 } from "lucide-react"

export default function AnalyticsPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [authLoading, user, router])

  useEffect(() => {
    if (!authLoading && profile && profile.role !== 'admin') {
      router.push('/dashboard')
    }
  }, [authLoading, profile, router])

  if (authLoading || !user || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-white/60">Loading...</div>
      </div>
    )
  }

  if (profile.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-white/60">Redirecting...</div>
      </div>
    )
  }

  return (
    <SidebarLayout breadcrumbs={[{ label: "Analytics" }]}>
      <div className="pt-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-white tracking-tight">Analytics</h1>
            <p className="text-white/40 mt-1">Track performance and insights</p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-24 h-24 bg-[#35383D] rounded-2xl flex items-center justify-center mb-6">
            <BarChart2 className="w-12 h-12 text-white/40" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Coming Soon</h3>
          <p className="text-white/40 text-center max-w-md">
            Analytics and insights will be available here soon.
          </p>
        </div>
      </div>
    </SidebarLayout>
  )
}
