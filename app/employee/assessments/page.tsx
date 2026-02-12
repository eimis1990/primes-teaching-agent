"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { SidebarLayout } from "@/components/layouts/sidebar-layout"
import { useAuth } from "@/contexts/auth-context"
import { Toaster } from "sonner"
import {
  ClipboardCheck,
  Calendar,
  ArrowRight,
  Search,
} from "lucide-react"
import { AssessmentStatusBadge } from "@/components/assessments/assessment-status-badge"
import type { Assessment, AssessmentStatus } from "@/lib/types/assessments"

export default function EmployeeAssessmentsPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<AssessmentStatus | "all">("all")
  const [searchQuery, setSearchQuery] = useState("")

  console.log("🎯 ASSESSMENTS PAGE LOADED", {
    authLoading,
    hasUser: !!user,
    userEmail: user?.email,
    hasProfile: !!profile,
    profileRole: profile?.role,
    pathname: typeof window !== 'undefined' ? window.location.pathname : 'server'
  })

  const loadAssessments = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/assessments")
      const result = await response.json()

      if (response.ok) {
        setAssessments(result.data || [])
      } else {
        console.error("Error loading assessments:", result.error)
      }
    } catch (error) {
      console.error("Error loading assessments:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    console.log("🔄 useEffect triggered", { authLoading, hasUser: !!user })
    
    if (!authLoading && !user) {
      console.log("❌ No user, redirecting to login")
      router.push("/login")
      return
    }

    if (user) {
      console.log("✅ User found, loading assessments")
      loadAssessments()
    }
  }, [user, authLoading, router, loadAssessments])

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "—"
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const getStatusAction = (status: AssessmentStatus) => {
    switch (status) {
      case "sent":
        return { label: "Start", color: "bg-[#F34A23] hover:bg-[#E04420]" }
      case "in_progress":
        return { label: "Continue", color: "bg-amber-500 hover:bg-amber-600" }
      case "completed":
        return { label: "View Results", color: "bg-emerald-500 hover:bg-emerald-600" }
      default:
        return { label: "View", color: "bg-white/10 hover:bg-white/20" }
    }
  }

  const filteredAssessments = assessments.filter((a) => {
    const matchesFilter = filter === "all" || a.status === filter
    const matchesSearch = a.title.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-white/60">Loading...</div>
      </div>
    )
  }

  return (
    <SidebarLayout breadcrumbs={[{ label: "My Assessments" }]}>
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

      <div className="space-y-6">
        <div>
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-white tracking-tight">
              My Assessments
            </h1>
            <p className="text-white/40 text-sm mt-1">
              View and complete your assigned assessments
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="Search assessments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#1B1C20] border border-white/[0.08] rounded-lg pl-10 pr-4 py-2.5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-white/20"
              />
            </div>

            {/* Status filter */}
            <div className="flex gap-2">
              {(["all", "sent", "in_progress", "completed"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filter === status
                      ? "bg-[#F34A23] text-white"
                      : "bg-white/5 text-white/60 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {status === "all" ? "All" : status === "in_progress" ? "In Progress" : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="h-[1px] bg-white/10 w-full mb-6" />

        <div className="px-6 md:px-8 pb-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-white/60">Loading assessments...</div>
            </div>
          ) : filteredAssessments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-[#1B1C20] rounded-xl border border-white/[0.08]">
              <div className="w-20 h-20 bg-[#35383D] rounded-2xl flex items-center justify-center mb-4">
                <ClipboardCheck className="w-10 h-10 text-white/40" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {searchQuery || filter !== "all" ? "No matching assessments" : "No assessments yet"}
              </h3>
              <p className="text-white/40 text-center max-w-md">
                {searchQuery || filter !== "all"
                  ? "Try adjusting your search or filter criteria."
                  : "You don't have any assessments assigned yet. Check back later."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAssessments.map((assessment) => {
                const action = getStatusAction(assessment.status)
                const isOverdue =
                  assessment.due_date &&
                  new Date(assessment.due_date) < new Date() &&
                  assessment.status !== "completed"

                return (
                  <div
                    key={assessment.id}
                    className="bg-[#1B1C20] rounded-xl border border-white/[0.08] p-6 hover:border-white/20 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-white font-medium">{assessment.title}</h3>
                          <AssessmentStatusBadge status={assessment.status} />
                          {isOverdue && (
                            <span className="px-2 py-0.5 bg-red-500/10 text-red-400 text-xs rounded-full">
                              Overdue
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-4 text-white/40 text-sm">
                          {assessment.assessment_type && (
                            <span className="flex items-center gap-1.5">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: assessment.assessment_type.color }}
                              />
                              {assessment.assessment_type.name}
                            </span>
                          )}
                          {assessment.due_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              Due {formatDate(assessment.due_date)}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <ClipboardCheck className="w-3.5 h-3.5" />
                            {assessment.total_points} points
                          </span>
                        </div>

                        {assessment.status === "completed" && assessment.score !== undefined && (
                          <div className="mt-3 flex items-center gap-4">
                            <div
                              className={`text-2xl font-bold ${
                                assessment.score >= assessment.passing_score
                                  ? "text-emerald-400"
                                  : "text-red-400"
                              }`}
                            >
                              {assessment.score.toFixed(0)}%
                            </div>
                            <span
                              className={`text-sm ${
                                assessment.score >= assessment.passing_score
                                  ? "text-emerald-400"
                                  : "text-red-400"
                              }`}
                            >
                              {assessment.score >= assessment.passing_score ? "Passed" : "Failed"}
                            </span>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => {
                          if (assessment.status === "completed") {
                            router.push(`/employee/assessment/${assessment.id}/results`)
                          } else {
                            router.push(`/employee/assessment/${assessment.id}`)
                          }
                        }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors ${action.color}`}
                      >
                        <span>{action.label}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  )
}
