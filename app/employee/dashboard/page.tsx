"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { SidebarLayout } from "@/components/layouts/sidebar-layout"
import { RoleGuard } from "@/lib/auth/role-guard"
import { useAuth } from "@/contexts/auth-context"
import { Toaster } from "sonner"
import { StatCard } from "@/components/dashboard/stat-card"
import { motion } from "framer-motion"
import {
  ClipboardCheck,
  Clock,
  CheckCircle,
  AlertCircle,
  Trophy,
  ArrowRight,
  Calendar,
} from "lucide-react"
import { AssessmentStatusBadge } from "@/components/assessments/assessment-status-badge"
import type { Assessment, AssessmentStatus } from "@/lib/types/assessments"

interface DashboardStats {
  pending: number
  in_progress: number
  completed: number
  average_score: number
}

function EmployeeDashboardContent() {
  const { user, profile } = useAuth()
  const router = useRouter()
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    pending: 0,
    in_progress: 0,
    completed: 0,
    average_score: 0,
  })
  const [loading, setLoading] = useState(true)

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/assessments")
      const result = await response.json()

      if (response.ok) {
        const assessmentsData = result.data || []
        setAssessments(assessmentsData)
        
        // Calculate stats from assessments
        const statsData = {
          pending: assessmentsData.filter((a: Assessment) => a.status === 'sent').length,
          in_progress: assessmentsData.filter((a: Assessment) => a.status === 'in_progress').length,
          completed: assessmentsData.filter((a: Assessment) => a.status === 'completed').length,
          average_score: assessmentsData
            .filter((a: Assessment) => a.status === 'completed' && a.score !== undefined)
            .reduce((acc: number, a: Assessment, _: number, arr: Assessment[]) => 
              acc + (a.score || 0) / arr.length, 0)
        }
        setStats(statsData)
      } else {
        console.error("Error loading dashboard:", result.error)
      }
    } catch (error) {
      console.error("Error loading dashboard:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

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
        return { label: "Start Assessment", color: "bg-[#F34A23] hover:bg-[#E04420]" }
      case "in_progress":
        return { label: "Continue", color: "bg-amber-500 hover:bg-amber-600" }
      case "completed":
        return { label: "View Results", color: "bg-emerald-500 hover:bg-emerald-600" }
      default:
        return { label: "View", color: "bg-white/10 hover:bg-white/20" }
    }
  }

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
      <div className="pt-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white tracking-tight">
            Welcome back, {profile?.full_name?.split(" ")[0] || user?.email?.split("@")[0]}
          </h1>
          <p className="text-white/40 text-sm mt-1">
            Here's an overview of your assessments
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0 }}
          >
            <StatCard
              icon={<Clock className="w-5 h-5" />}
              title="Pending"
              value={stats.pending}
              changePercentage="+0%"
              changeLabel="new this week"
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
          >
            <StatCard
              icon={<AlertCircle className="w-5 h-5" />}
              title="In Progress"
              value={stats.in_progress}
              changePercentage="+0%"
              changeLabel="this week"
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <StatCard
              icon={<CheckCircle className="w-5 h-5" />}
              title="Completed"
              value={stats.completed}
              changePercentage="+0%"
              changeLabel="this month"
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
          >
            <StatCard
              icon={<Trophy className="w-5 h-5" />}
              title="Average Score"
              value={`${stats.average_score.toFixed(0)}%`}
              changePercentage="+0%"
              changeLabel="vs last month"
            />
          </motion.div>
        </div>

        <h2 className="text-lg font-semibold text-white mb-4">Your Assessments</h2>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-white/60">Loading assessments...</div>
          </div>
        ) : assessments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-[#1B1C20] rounded-xl border border-white/[0.08]">
            <div className="w-20 h-20 bg-[#35383D] rounded-2xl flex items-center justify-center mb-4">
              <ClipboardCheck className="w-10 h-10 text-white/40" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No assessments yet</h3>
            <p className="text-white/40 text-center max-w-md">
              You don't have any assessments assigned yet. Check back later or contact your administrator.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {assessments.map((assessment) => {
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
    </>
  )
}

export default function EmployeeDashboardPage() {
  return (
    <RoleGuard allowedRoles={["employee"]} redirectTo="/dashboard">
      <SidebarLayout breadcrumbs={[{ label: "Dashboard" }]}>
        <EmployeeDashboardContent />
      </SidebarLayout>
    </RoleGuard>
  )
}
