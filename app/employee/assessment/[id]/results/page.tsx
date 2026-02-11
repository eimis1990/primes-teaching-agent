"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { SidebarLayout } from "@/components/layouts/sidebar-layout"
import { Toaster, toast } from "sonner"
import {
  ArrowLeft,
  Trophy,
  XCircle,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import type { Assessment, AssessmentQuestion, AssessmentAnswer } from "@/lib/types/assessments"

interface ResultsData {
  assessment: Assessment
  questions: AssessmentQuestion[]
  answers: AssessmentAnswer[] | null
}

export default function AssessmentResultsPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const assessmentId = params?.id as string

  const [data, setData] = useState<ResultsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set())

  const loadResults = useCallback(async () => {
    if (!assessmentId) return

    setLoading(true)
    try {
      const response = await fetch(`/api/assessments/${assessmentId}`)
      const result = await response.json()

      if (response.ok) {
        // API returns { data: { ...assessment, questions, topics, answers } }
        const assessmentData = result.data
        
        // If not completed, redirect to take assessment
        if (assessmentData.status !== "completed") {
          router.push(`/employee/assessment/${assessmentId}`)
          return
        }
        
        setData({
          assessment: assessmentData,
          questions: assessmentData.questions || [],
          answers: assessmentData.answers || null
        })
      } else {
        toast.error(result.error || "Failed to load results")
        router.push("/employee/assessments")
      }
    } catch (error) {
      console.error("Error loading results:", error)
      toast.error("Failed to load results")
      router.push("/employee/assessments")
    } finally {
      setLoading(false)
    }
  }, [assessmentId, router])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [authLoading, user, router])

  useEffect(() => {
    if (user && assessmentId) {
      loadResults()
    }
  }, [user, assessmentId, loadResults])

  const toggleQuestion = (questionId: string) => {
    setExpandedQuestions((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(questionId)) {
        newSet.delete(questionId)
      } else {
        newSet.add(questionId)
      }
      return newSet
    })
  }

  const getAnswerForQuestion = (questionId: string) => {
    return data?.answers?.find((a) => a.question_id === questionId)
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2 text-white/60">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <SidebarLayout breadcrumbs={[
      { label: "My Assessments", href: "/employee/assessments" },
      { label: data?.assessment.title || "Results" }
    ]}>
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
        {loading || !data ? (
          <div className="flex items-center justify-center min-h-screen">
            <div className="flex items-center gap-2 text-white/60">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading results...</span>
            </div>
          </div>
        ) : (
          <>
            {/* Hero Header */}
            <div className="relative pt-12 px-6 md:px-12 pb-8 overflow-hidden">
              {/* Background gradient */}
              <div className={`absolute inset-0 ${
                (data.assessment.score !== undefined && data.assessment.score >= data.assessment.passing_score)
                  ? "bg-gradient-to-br from-emerald-500/10 via-emerald-600/5 to-transparent" 
                  : "bg-gradient-to-br from-red-500/10 via-red-600/5 to-transparent"
              }`} />
              
              {/* Decorative circles */}
              <div className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl ${
                (data.assessment.score !== undefined && data.assessment.score >= data.assessment.passing_score)
                  ? "bg-emerald-500/10" : "bg-red-500/10"
              }`} style={{ transform: "translate(30%, -30%)" }} />
              
              <div className="relative z-10">
              {/* Back button */}
              <button
                onClick={() => router.push("/employee/assessments")}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition-all mb-8 group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span className="text-sm font-medium">Back</span>
              </button>

              {/* Title and subtitle */}
              <div className="mb-8">
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">
                  {data.assessment.title}
                </h1>
                <p className="text-white/50 text-lg">Assessment Results</p>
              </div>

              {/* Main result card */}
              <div className={`rounded-3xl p-8 md:p-10 backdrop-blur-sm border-2 ${
                (data.assessment.score !== undefined && data.assessment.score >= data.assessment.passing_score)
                  ? "bg-gradient-to-br from-emerald-500/20 via-emerald-600/10 to-transparent border-emerald-500/30"
                  : "bg-gradient-to-br from-red-500/20 via-red-600/10 to-transparent border-red-500/30"
              } shadow-2xl`}>
                <div className="flex flex-col md:flex-row items-center gap-8 mb-10">
                  {/* Icon */}
                  <div className={`relative w-28 h-28 rounded-full flex items-center justify-center ${
                    (data.assessment.score !== undefined && data.assessment.score >= data.assessment.passing_score)
                      ? "bg-gradient-to-br from-emerald-500/30 to-emerald-600/10" 
                      : "bg-gradient-to-br from-red-500/30 to-red-600/10"
                  }`}>
                    <div className={`absolute inset-0 rounded-full animate-pulse ${
                      (data.assessment.score !== undefined && data.assessment.score >= data.assessment.passing_score)
                        ? "bg-emerald-500/20" : "bg-red-500/20"
                    }`} />
                    {(data.assessment.score !== undefined && data.assessment.score >= data.assessment.passing_score) ? (
                      <Trophy className="w-14 h-14 text-emerald-400 relative z-10" />
                    ) : (
                      <AlertCircle className="w-14 h-14 text-red-400 relative z-10" />
                    )}
                  </div>

                  {/* Text */}
                  <div className="flex-1 text-center md:text-left">
                    <h2 className={`text-3xl md:text-4xl font-bold mb-3 ${
                      (data.assessment.score !== undefined && data.assessment.score >= data.assessment.passing_score)
                        ? "text-emerald-400" : "text-red-400"
                    }`}>
                      {(data.assessment.score !== undefined && data.assessment.score >= data.assessment.passing_score)
                        ? "Congratulations! You Passed!" : "Keep Learning!"}
                    </h2>
                    <p className="text-white/70 text-lg leading-relaxed max-w-2xl">
                      {(data.assessment.score !== undefined && data.assessment.score >= data.assessment.passing_score)
                        ? "Excellent work! You've demonstrated strong understanding of the material and achieved a passing score."
                        : "You didn't pass this time, but that's okay! Review the feedback below, learn from it, and you'll do great next time."
                      }
                    </p>
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className={`rounded-2xl p-6 backdrop-blur-sm border ${
                    (data.assessment.score !== undefined && data.assessment.score >= data.assessment.passing_score)
                      ? "bg-emerald-500/5 border-emerald-500/20" 
                      : "bg-red-500/5 border-red-500/20"
                  }`}>
                    <p className="text-white/50 text-sm font-medium mb-3 uppercase tracking-wider">Your Score</p>
                    <p className={`text-5xl font-bold ${
                      (data.assessment.score !== undefined && data.assessment.score >= data.assessment.passing_score)
                        ? "text-emerald-400" : "text-red-400"
                    }`}>
                      {data.assessment.score?.toFixed(0) || 0}
                      <span className="text-2xl text-white/40 ml-1">%</span>
                    </p>
                  </div>

                  <div className="bg-white/5 rounded-2xl p-6 backdrop-blur-sm border border-white/10">
                    <p className="text-white/50 text-sm font-medium mb-3 uppercase tracking-wider">Passing Score</p>
                    <p className="text-5xl font-bold text-white">
                      {data.assessment.passing_score}
                      <span className="text-2xl text-white/40 ml-1">%</span>
                    </p>
                  </div>

                  <div className="bg-white/5 rounded-2xl p-6 backdrop-blur-sm border border-white/10">
                    <p className="text-white/50 text-sm font-medium mb-3 uppercase tracking-wider">Correct Answers</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-5xl font-bold text-white">
                        {data.answers?.filter((a) => a.is_correct).length || 0}
                      </p>
                      <p className="text-2xl text-white/40 font-medium">/ {data.questions.length}</p>
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-2xl p-6 backdrop-blur-sm border border-white/10">
                    <p className="text-white/50 text-sm font-medium mb-3 uppercase tracking-wider">Points Earned</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-5xl font-bold text-white">{data.assessment.earned_points || 0}</p>
                      <p className="text-2xl text-white/40 font-medium">/ {data.assessment.total_points || 0}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        {/* Detailed Results */}
        <div className="px-6 md:px-12 pb-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-1 h-8 bg-gradient-to-b from-[#F34A23] to-[#F34A23]/40 rounded-full" />
            <h2 className="text-2xl font-bold text-white">Question Review</h2>
          </div>

          <div className="space-y-3">
            {data.questions.map((question, index) => {
              const answer = getAnswerForQuestion(question.id)
              const isExpanded = expandedQuestions.has(question.id)

              return (
                <div
                  key={question.id}
                  className={`bg-[#1B1C20] rounded-2xl border overflow-hidden transition-all ${
                    isExpanded 
                      ? answer?.is_correct 
                        ? "border-emerald-500/30 shadow-lg shadow-emerald-500/10" 
                        : "border-red-500/30 shadow-lg shadow-red-500/10"
                      : "border-white/[0.08] hover:border-white/20"
                  }`}
                >
                  {/* Question header - clickable */}
                  <button
                    onClick={() => toggleQuestion(question.id)}
                    className="w-full p-5 flex items-center gap-4 hover:bg-white/[0.02] transition-all group"
                  >
                    {/* Status icon */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                      answer?.is_correct
                        ? "bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 group-hover:scale-105"
                        : "bg-gradient-to-br from-red-500/20 to-red-600/10 group-hover:scale-105"
                    }`}>
                      {answer?.is_correct ? (
                        <CheckCircle className="w-6 h-6 text-emerald-400" />
                      ) : (
                        <XCircle className="w-6 h-6 text-red-400" />
                      )}
                    </div>

                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-white/50 text-sm font-medium">Question {index + 1}</span>
                        <div className="w-1 h-1 rounded-full bg-white/20" />
                        <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                          answer?.is_correct
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "bg-red-500/15 text-red-400"
                        }`}>
                          {answer?.points_earned || 0}/{question.points} points
                        </span>
                      </div>
                      <p className="text-white text-base font-medium line-clamp-2 pr-4">
                        {question.question_text}
                      </p>
                    </div>

                    <div className="flex-shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-white/40 group-hover:text-white/60 transition-colors" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-white/40 group-hover:text-white/60 transition-colors" />
                      )}
                    </div>
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="border-t border-white/[0.08] p-6 space-y-6 bg-black/20">
                      {/* Full question */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                          <p className="text-blue-400 text-xs font-semibold uppercase tracking-wider">Question</p>
                        </div>
                        <p className="text-white/90 text-base leading-relaxed pl-3.5">{question.question_text}</p>
                      </div>

                      {/* Your answer */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            answer?.is_correct ? "bg-emerald-400" : "bg-red-400"
                          }`} />
                          <p className={`text-xs font-semibold uppercase tracking-wider ${
                            answer?.is_correct ? "text-emerald-400" : "text-red-400"
                          }`}>Your Answer</p>
                        </div>
                        <div className={`p-4 rounded-xl border-2 ${
                          answer?.is_correct
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-50"
                            : "bg-red-500/10 border-red-500/30 text-red-50"
                        }`}>
                          <p className="leading-relaxed">{answer?.answer_text || "No answer provided"}</p>
                        </div>
                      </div>

                      {/* Correct answer (if wrong) */}
                      {!answer?.is_correct && question.correct_answer && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <p className="text-emerald-400 text-xs font-semibold uppercase tracking-wider">Correct Answer</p>
                          </div>
                          <div className="p-4 rounded-xl bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-50">
                            <p className="leading-relaxed">{question.correct_answer}</p>
                          </div>
                        </div>
                      )}

                      {/* AI Feedback */}
                      {answer?.ai_feedback && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                            <p className="text-purple-400 text-xs font-semibold uppercase tracking-wider">AI Feedback</p>
                          </div>
                          <div className="p-4 rounded-xl bg-purple-500/10 border-2 border-purple-500/20 text-purple-50">
                            <p className="leading-relaxed">{answer.ai_feedback}</p>
                          </div>
                        </div>
                      )}

                      {/* Explanation */}
                      {question.explanation && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                            <p className="text-blue-400 text-xs font-semibold uppercase tracking-wider">Explanation</p>
                          </div>
                          <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
                            <p className="text-white/70 leading-relaxed">{question.explanation}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
          </>
        )}
      </div>
    </SidebarLayout>
  )
}
