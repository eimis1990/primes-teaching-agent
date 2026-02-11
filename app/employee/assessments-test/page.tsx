"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { SidebarLayout } from "@/components/layouts/sidebar-layout"

export default function EmployeeAssessmentsTest() {
  const { user, profile, loading } = useAuth()
  const [assessments, setAssessments] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    console.log("📊 Assessments Test Page - Auth State:", { 
      loading, 
      hasUser: !!user, 
      hasProfile: !!profile,
      role: profile?.role 
    })

    if (!loading && !user) {
      console.log("➡️ No user, redirecting to login")
      router.push("/login")
      return
    }

    if (user) {
      console.log("📡 Fetching assessments...")
      fetch("/api/assessments")
        .then(res => res.json())
        .then(data => {
          console.log("✅ Assessments loaded:", data)
          if (data.data) {
            setAssessments(data.data)
          }
        })
        .catch(err => {
          console.error("❌ Error loading assessments:", err)
        })
    }
  }, [user, loading, router])

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  return (
    <SidebarLayout breadcrumbs={[{ label: "Assessments Test" }]}>
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
            <h1 className="text-2xl font-bold text-emerald-400 mb-2">
              ✅ Employee Assessments Test Page
            </h1>
            <p className="text-emerald-400/80 text-sm">
              This page has NO RoleGuard - just basic auth check
            </p>
          </div>

          <div className="mb-6 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
            <p className="text-blue-400 text-sm">
              👤 Logged in as: <strong>{user.email}</strong>
            </p>
            <p className="text-blue-400 text-sm">
              🎭 Role: <strong>{profile?.role || "Loading..."}</strong>
            </p>
          </div>

          <h2 className="text-xl font-semibold text-white mb-4">My Assessments</h2>

          {assessments.length === 0 ? (
            <div className="bg-[#1B1C20] border border-white/10 rounded-xl p-12 text-center">
              <p className="text-white/60">No assessments found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {assessments.map((assessment) => (
                <div
                  key={assessment.id}
                  onClick={() => {
                    console.log("🖱️ Clicked assessment:", assessment.id, "Status:", assessment.status)
                    if (assessment.status === "completed") {
                      router.push(`/employee/assessment/${assessment.id}/results`)
                    } else {
                      router.push(`/employee/assessment/${assessment.id}`)
                    }
                  }}
                  className="bg-[#1B1C20] border border-white/10 rounded-xl p-6 hover:border-white/20 transition-colors cursor-pointer"
                >
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {assessment.title}
                  </h3>
                  <div className="flex items-center gap-4">
                    <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                      {assessment.status}
                    </span>
                    {assessment.due_date && (
                      <span className="text-white/40 text-xs">
                        Due: {new Date(assessment.due_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  )
}
