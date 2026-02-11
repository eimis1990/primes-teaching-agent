"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { SidebarLayout } from "@/components/layouts/sidebar-layout"
import { useAuth } from "@/contexts/auth-context"
import { PageHeader } from "@/components/dashboard/page-header"
import { EnhancedAssessmentWizard } from "@/components/assessments/assessment-wizard/enhanced-index"

export default function NewAssessmentPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [authLoading, user, router])

  if (authLoading || !user) {
    return (
      <SidebarLayout breadcrumbs={[
        { label: "Assessments", href: "/assessments" },
        { label: "Create New" }
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
      { label: "Create New" }
    ]}>
      <PageHeader
        title="Create Assessment"
        description="Set up a new knowledge assessment for your team"
        backButton={{ href: "/assessments" }}
        className="mb-4"
      />
      <div className="py-3 md:py-4">
        <EnhancedAssessmentWizard />
      </div>
    </SidebarLayout>
  )
}
