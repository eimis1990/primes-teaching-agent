"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { SidebarLayout } from "@/components/layouts/sidebar-layout"
import { PageHeader } from "@/components/dashboard/page-header"
import { PageContainer } from "@/components/ui/page-container"
import { useAuth } from "@/contexts/auth-context"
import { AssessmentTypeManager } from "@/components/assessments/assessment-type-manager"
import type { AssessmentType } from "@/lib/types/assessments"

export default function AssessmentSettingsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [types, setTypes] = useState<AssessmentType[]>([])
  const [loading, setLoading] = useState(true)

  const loadTypes = useCallback(async () => {
    if (!user) return

    setLoading(true)
    try {
      const response = await fetch("/api/assessments/types")
      const result = await response.json()

      if (response.ok) {
        setTypes(result.data || [])
      } else {
        console.error("Error loading types:", result.error)
      }
    } catch (error) {
      console.error("Error loading types:", error)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [authLoading, user, router])

  useEffect(() => {
    if (user) {
      loadTypes()
    }
  }, [user, loadTypes])

  if (authLoading || !user) {
    return (
      <SidebarLayout breadcrumbs={[
        { label: "Assessments", href: "/assessments" },
        { label: "Types" }
      ]}>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-white/60">Loading...</div>
        </div>
      </SidebarLayout>
    )
  }

  return (
    <SidebarLayout breadcrumbs={[
      { label: "Assessments", href: "/assessments" },
      { label: "Types" }
    ]}>
      <PageHeader
        title="Assessment Types"
        description="Manage the types of assessments available in your organization"
        backButton={{ href: "/assessments" }}
      />

      <div className="max-w-2xl">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-white/60">Loading assessment types...</div>
            </div>
          ) : (
            <div>
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-white mb-2">Your Assessment Types</h2>
                <p className="text-white/40 text-sm">
                  Create and manage different types of assessments. These types help categorize your evaluations.
                </p>
              </div>

              <AssessmentTypeManager types={types} onRefresh={loadTypes} />

              {types.length === 0 && !loading && (
                <div className="mt-8 p-6 bg-[#1B1C20] rounded-xl border border-white/[0.08]">
                  <h3 className="text-white font-medium mb-2">Getting Started</h3>
                  <p className="text-white/40 text-sm mb-4">
                    Create your first assessment type to get started. Common types include:
                  </p>
                  <ul className="list-disc list-inside text-white/60 text-sm space-y-1">
                    <li>Performance Review</li>
                    <li>Skills Assessment</li>
                    <li>Compliance Quiz</li>
                    <li>Onboarding Checklist</li>
                    <li>Knowledge Check</li>
                  </ul>
                </div>
              )}
            </div>
          )}
      </div>
    </SidebarLayout>
  )
}
