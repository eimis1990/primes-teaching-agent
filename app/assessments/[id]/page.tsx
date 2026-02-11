"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { SidebarLayout } from "@/components/layouts/sidebar-layout"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "sonner"
import { PageHeader } from "@/components/dashboard/page-header"
import { Button } from "@/components/ui/button"
import {
  Calendar,
  User,
  Clock,
  Target,
  Send,
  Trash2,
  FileText,
  BookOpen,
  Loader2,
  CheckCircle,
  XCircle,
} from "lucide-react"
import { AssessmentStatusBadge } from "@/components/assessments/assessment-status-badge"
import type { Assessment, AssessmentQuestion, AssessmentTopic } from "@/lib/types/assessments"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function AssessmentDetailPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const assessmentId = params.id as string

  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([])
  const [topics, setTopics] = useState<AssessmentTopic[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const loadAssessment = useCallback(async () => {
    if (!user || !assessmentId) return

    setLoading(true)
    try {
      const response = await fetch(`/api/assessments/${assessmentId}`)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to load assessment")
      }

      // Check if the current user is an employee assigned to this assessment
      // If so, redirect them to the employee assessment interface
      const assessment = result.data
      if (assessment.employee_id === user.id) {
        // Employee viewing their own assessment - redirect to test-taking interface
        if (assessment.status === "completed") {
          router.push(`/employee/assessment/${assessmentId}/results`)
        } else {
          router.push(`/employee/assessment/${assessmentId}`)
        }
        return
      }

      setAssessment(assessment)
      setQuestions(assessment.questions || [])
      setTopics(assessment.topics || [])
    } catch (error) {
      console.error("Error loading assessment:", error)
      toast.error("Failed to load assessment")
      router.push("/assessments")
    } finally {
      setLoading(false)
    }
  }, [user, assessmentId, router])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [authLoading, user, router])

  useEffect(() => {
    if (user && assessmentId) {
      loadAssessment()
    }
  }, [user, assessmentId, loadAssessment])

  const handleSend = async () => {
    if (!assessment || assessment.status !== "draft") return

    setSending(true)
    try {
      const response = await fetch(`/api/assessments/${assessmentId}/send`, {
        method: "POST",
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to send assessment")
      }

      toast.success("Assessment sent to employee")
      loadAssessment()
    } catch (error) {
      console.error("Error sending assessment:", error)
      toast.error(error instanceof Error ? error.message : "Failed to send assessment")
    } finally {
      setSending(false)
    }
  }

  const handleDelete = async () => {
    setShowDeleteDialog(false)
    
    try {
      const response = await fetch(`/api/assessments/${assessmentId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || "Failed to delete assessment")
      }

      toast.success("Assessment deleted")
      router.push("/assessments")
    } catch (error) {
      console.error("Error deleting assessment:", error)
      toast.error(error instanceof Error ? error.message : "Failed to delete assessment")
    }
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "—"
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  if (authLoading || !user || loading) {
    return (
      <SidebarLayout breadcrumbs={[
        { label: "Assessments", href: "/assessments" },
        { label: loading ? "Loading..." : "Assessment" }
      ]}>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-white/60">Loading...</div>
        </div>
      </SidebarLayout>
    )
  }

  if (!assessment) {
    return (
      <SidebarLayout breadcrumbs={[
        { label: "Assessments", href: "/assessments" },
        { label: "Not Found" }
      ]}>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-white/60">Assessment not found</div>
        </div>
      </SidebarLayout>
    )
  }

  return (
    <SidebarLayout breadcrumbs={[
      { label: "Assessments", href: "/assessments" },
      { label: assessment.title }
    ]}>
        <div>
          <PageHeader
            title={assessment.title}
            description={`Created ${formatDate(assessment.created_at)}`}
            badge={<AssessmentStatusBadge status={assessment.status} />}
            backButton={{ href: "/assessments" }}
            actions={
              <Button
                onClick={() => setShowDeleteDialog(true)}
                className="bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 border border-red-500/30"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            }
          />

          {/* Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Questions */}
              <div className="bg-[#1B1C20] rounded-xl border border-white/[0.08] overflow-hidden">
                <div className="px-6 py-4 border-b border-white/[0.08]">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-white/60" />
                    Questions ({questions.length})
                  </h2>
                </div>
                <div className="divide-y divide-white/[0.04]">
                  {questions.map((question, index) => (
                    <div key={question.id} className="p-6">
                      <div className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/60 text-sm mt-1">
                          {index + 1}
                        </span>
                        <div className="flex-1">
                          {/* Type and Points - Above Question */}
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium ${
                                question.question_type === "multiple_choice"
                                  ? "bg-blue-500/20 text-blue-400"
                                  : question.question_type === "true_false"
                                  ? "bg-purple-500/20 text-purple-400"
                                  : "bg-emerald-500/20 text-emerald-400"
                              }`}
                            >
                              {question.question_type.replace("_", " ")}
                            </span>
                            <span className="text-white/40 text-xs">{question.points} pts</span>
                          </div>
                          
                          {/* Question Text */}
                          <p className="text-white">{question.question_text}</p>
                          
                          {/* Options */}
                          {question.options && question.options.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {question.options.map((option) => (
                                <div
                                  key={option.id}
                                  className={`flex items-center gap-2 text-sm ${
                                    option.isCorrect ? "text-emerald-400" : "text-white/60"
                                  }`}
                                >
                                  {option.isCorrect ? (
                                    <CheckCircle className="w-4 h-4" />
                                  ) : (
                                    <XCircle className="w-4 h-4 text-white/30" />
                                  )}
                                  <span>{option.text}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Employee */}
              <div className="bg-[#1B1C20] rounded-xl border border-white/[0.08] p-6">
                <h3 className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-4">
                  Assigned To
                </h3>
                {assessment.employee ? (
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-white/10 flex-shrink-0">
                      {assessment.employee.avatar_url ? (
                        <img
                          src={assessment.employee.avatar_url}
                          alt={assessment.employee.full_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#F34A23] to-[#E04420] text-white text-lg font-medium">
                          {assessment.employee.full_name[0]}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-white font-medium">{assessment.employee.full_name}</p>
                      <p className="text-white/40 text-sm">{assessment.employee.email}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-white/40">No employee assigned</p>
                )}
              </div>

              {/* Details */}
              <div className="bg-[#1B1C20] rounded-xl border border-white/[0.08] p-6">
                <h3 className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-4">
                  Details
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Passing Score
                    </span>
                    <span className="text-white font-medium">{assessment.passing_score}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Difficulty
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        assessment.difficulty === "easy"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : assessment.difficulty === "medium"
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {assessment.difficulty.charAt(0).toUpperCase() + assessment.difficulty.slice(1)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Total Points
                    </span>
                    <span className="text-white font-medium">{assessment.total_points || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/60 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Due Date
                    </span>
                    <span className="text-white">{formatDate(assessment.due_date)}</span>
                  </div>
                </div>
              </div>

              {/* Topics */}
              <div className="bg-[#1B1C20] rounded-xl border border-white/[0.08] p-6">
                <h3 className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-4">
                  Topics ({topics.length})
                </h3>
                <div className="space-y-2">
                  {topics.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center gap-2 text-white/80"
                    >
                      <BookOpen className="w-4 h-4 text-white/40" />
                      <span className="text-sm">{t.topic?.title || "Unknown topic"}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Send to Employee Button */}
              {assessment.status === "draft" && (
                <Button
                  onClick={handleSend}
                  disabled={sending}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Send to Employee
                </Button>
              )}

              {/* Results (if completed) */}
              {(assessment.status === "completed" || assessment.status === "in_progress") &&
                assessment.score !== undefined && (
                  <div className="bg-[#1B1C20] rounded-xl border border-white/[0.08] p-6">
                    <h3 className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-4">
                      Results
                    </h3>
                    <div className="text-center">
                      <div
                        className={`text-4xl font-bold ${
                          (assessment.score || 0) >= assessment.passing_score
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {assessment.score?.toFixed(1)}%
                      </div>
                      <p className="text-white/40 text-sm mt-1">
                        {assessment.earned_points || 0} / {assessment.total_points || 0} points
                      </p>
                      <p
                        className={`text-sm mt-2 ${
                          (assessment.score || 0) >= assessment.passing_score
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {(assessment.score || 0) >= assessment.passing_score ? "Passed" : "Failed"}
                      </p>
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent className="bg-[#1B1C20] border-white/10">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Delete Assessment?</AlertDialogTitle>
              <AlertDialogDescription className="text-white/60">
                Are you sure you want to delete this assessment? This action cannot be undone and all data will be permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-transparent border-white/10 text-white hover:bg-white/5">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                Delete Assessment
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </SidebarLayout>
  )
}
