"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { SidebarLayout } from "@/components/layouts/sidebar-layout"
import { Toaster, toast } from "sonner"
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Clock,
  AlertCircle,
  Send,
  Loader2,
} from "lucide-react"
import type { Assessment, AssessmentQuestion, AssessmentAnswer, QuestionOption } from "@/lib/types/assessments"

interface AssessmentData {
  assessment: Assessment
  questions: AssessmentQuestion[]
  answers: AssessmentAnswer[] | null
}

export default function TakeAssessmentPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const assessmentId = params?.id as string

  const [data, setData] = useState<AssessmentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, { text: string; optionId?: string }>>({})

  const loadAssessment = useCallback(async () => {
    if (!assessmentId) return

    setLoading(true)
    try {
      const response = await fetch(`/api/assessments/${assessmentId}`)
      const result = await response.json()

      if (response.ok) {
        // API returns { data: { ...assessment, questions, topics, answers } }
        const assessmentData = result.data
        setData({
          assessment: assessmentData,
          questions: assessmentData.questions || [],
          answers: assessmentData.answers || null
        })

        // If already completed, redirect to results
        if (assessmentData.status === "completed") {
          router.push(`/employee/assessment/${assessmentId}/results`)
          return
        }

        // Pre-populate answers if resuming
        if (assessmentData.answers && assessmentData.answers.length > 0) {
          const existingAnswers: Record<string, { text: string; optionId?: string }> = {}
          for (const answer of assessmentData.answers) {
            existingAnswers[answer.question_id] = {
              text: answer.answer_text,
              optionId: answer.selected_option_id,
            }
          }
          setAnswers(existingAnswers)
        }
      } else {
        toast.error(result.error || "Failed to load assessment")
        router.push("/employee/assessments")
      }
    } catch (error) {
      console.error("Error loading assessment:", error)
      toast.error("Failed to load assessment")
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
      loadAssessment()
    }
  }, [user, assessmentId, loadAssessment])

  const currentQuestion = data?.questions[currentQuestionIndex]
  const totalQuestions = data?.questions.length || 0
  const answeredCount = Object.keys(answers).filter((k) => answers[k].text.trim()).length

  const handleAnswerChange = (questionId: string, text: string, optionId?: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { text, optionId },
    }))
  }

  const handleSelectOption = (questionId: string, option: QuestionOption) => {
    handleAnswerChange(questionId, option.text, option.id)
  }

  const goToQuestion = (index: number) => {
    if (index >= 0 && index < totalQuestions) {
      setCurrentQuestionIndex(index)
    }
  }

  const handleSubmit = async () => {
    if (!data) return

    // Check if all questions are answered
    const unansweredQuestions = data.questions.filter(
      (q) => !answers[q.id] || !answers[q.id].text.trim()
    )

    if (unansweredQuestions.length > 0) {
      toast.error(`Please answer all questions. ${unansweredQuestions.length} unanswered.`)
      // Go to first unanswered question
      const firstUnansweredIndex = data.questions.findIndex(
        (q) => !answers[q.id] || !answers[q.id].text.trim()
      )
      if (firstUnansweredIndex >= 0) {
        setCurrentQuestionIndex(firstUnansweredIndex)
      }
      return
    }

    setSubmitting(true)
    try {
      const submitData = {
        answers: Object.entries(answers).map(([question_id, answer]) => ({
          question_id,
          answer_text: answer.text,
          selected_option_id: answer.optionId,
        })),
      }

      const response = await fetch(`/api/assessments/${assessmentId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      })

      const result = await response.json()

      if (response.ok) {
        toast.success("Assessment submitted successfully!")
        router.push(`/employee/assessment/${assessmentId}/results`)
      } else {
        toast.error(result.error || "Failed to submit assessment")
      }
    } catch (error) {
      console.error("Error submitting assessment:", error)
      toast.error("Failed to submit assessment")
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || !user || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2 text-white/60">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading assessment...</span>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-white/60">Assessment not found</div>
      </div>
    )
  }

  return (
    <SidebarLayout breadcrumbs={[
      { label: "My Assessments", href: "/employee/assessments" },
      { label: data.assessment.title }
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
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-white/[0.08]">
          <div className="px-6 md:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push("/employee/assessments")}
                  className="p-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-lg font-semibold text-white">{data.assessment.title}</h1>
                  <div className="flex items-center gap-3 text-sm text-white/40">
                    {data.assessment.assessment_type && (
                      <span className="flex items-center gap-1.5">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: data.assessment.assessment_type.color }}
                        />
                        {data.assessment.assessment_type.name}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {answeredCount}/{totalQuestions} answered
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting || answeredCount < totalQuestions}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  answeredCount === totalQuestions
                    ? "bg-[#F34A23] hover:bg-[#E04420] text-white"
                    : "bg-white/10 text-white/40 cursor-not-allowed"
                }`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Assessment</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-white/5">
            <div
              className="h-full bg-[#F34A23] transition-all duration-300"
              style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
            />
          </div>
        </div>

        {/* Question Navigation Pills */}
        <div className="px-6 md:px-8 py-4 border-b border-white/[0.08]">
          <div className="flex flex-wrap gap-2">
            {data.questions.map((question, index) => {
              const isAnswered = answers[question.id]?.text?.trim()
              const isCurrent = index === currentQuestionIndex
              return (
                <button
                  key={question.id}
                  onClick={() => goToQuestion(index)}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium transition-all ${
                    isCurrent
                      ? "bg-[#F34A23] text-white"
                      : isAnswered
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60"
                  }`}
                >
                  {isAnswered && !isCurrent ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    index + 1
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Question Content */}
        <div className="px-6 md:px-8 py-8 max-w-3xl">
          {currentQuestion && (
            <div className="space-y-6">
              {/* Question header */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#F34A23]/10 flex items-center justify-center text-[#F34A23] font-semibold flex-shrink-0">
                  {currentQuestionIndex + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      currentQuestion.question_type === "multiple_choice"
                        ? "bg-blue-500/10 text-blue-400"
                        : currentQuestion.question_type === "true_false"
                          ? "bg-purple-500/10 text-purple-400"
                          : currentQuestion.question_type === "scenario"
                            ? "bg-amber-500/10 text-amber-400"
                            : "bg-emerald-500/10 text-emerald-400"
                    }`}>
                      {currentQuestion.question_type === "multiple_choice" && "Multiple Choice"}
                      {currentQuestion.question_type === "true_false" && "True/False"}
                      {currentQuestion.question_type === "open_ended" && "Open Ended"}
                      {currentQuestion.question_type === "scenario" && "Scenario"}
                    </span>
                    <span className="text-white/40 text-xs">
                      {currentQuestion.points} points
                    </span>
                  </div>
                  <p className="text-white text-lg leading-relaxed">{currentQuestion.question_text}</p>
                </div>
              </div>

              {/* Answer area */}
              <div className="pl-14">
                {(currentQuestion.question_type === "multiple_choice" && currentQuestion.options?.length > 0) ? (
                  <div className="space-y-3">
                    {currentQuestion.options.map((option) => {
                      const isSelected = answers[currentQuestion.id]?.optionId === option.id
                      return (
                        <button
                          key={option.id}
                          onClick={() => handleSelectOption(currentQuestion.id, option)}
                          className={`w-full p-4 rounded-xl text-left transition-all ${
                            isSelected
                              ? "bg-[#F34A23]/10 border-2 border-[#F34A23] text-white"
                              : "bg-[#1B1C20] border border-white/[0.08] text-white/80 hover:border-white/20"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              isSelected
                                ? "border-[#F34A23] bg-[#F34A23]"
                                : "border-white/30"
                            }`}>
                              {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                            </div>
                            <span>{option.text}</span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                ) : currentQuestion.question_type === "true_false" ? (
                  <div className="flex gap-4">
                    {["True", "False"].map((option) => {
                      const isSelected = answers[currentQuestion.id]?.text?.toLowerCase() === option.toLowerCase()
                      return (
                        <button
                          key={option}
                          onClick={() => handleAnswerChange(currentQuestion.id, option)}
                          className={`flex-1 p-4 rounded-xl text-center font-medium transition-all ${
                            isSelected
                              ? "bg-[#F34A23]/10 border-2 border-[#F34A23] text-white"
                              : "bg-[#1B1C20] border border-white/[0.08] text-white/80 hover:border-white/20"
                          }`}
                        >
                          {option}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <textarea
                    value={answers[currentQuestion.id]?.text || ""}
                    onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                    placeholder="Type your answer here..."
                    rows={6}
                    className="w-full bg-[#1B1C20] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-[#F34A23]/50 resize-none"
                  />
                )}
              </div>

              {/* Navigation buttons */}
              <div className="pl-14 flex items-center justify-between pt-4">
                <button
                  onClick={() => goToQuestion(currentQuestionIndex - 1)}
                  disabled={currentQuestionIndex === 0}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    currentQuestionIndex === 0
                      ? "text-white/20 cursor-not-allowed"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>

                {currentQuestionIndex < totalQuestions - 1 ? (
                  <button
                    onClick={() => goToQuestion(currentQuestionIndex + 1)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white/10 text-white hover:bg-white/20 transition-colors"
                  >
                    <span>Next</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || answeredCount < totalQuestions}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      answeredCount === totalQuestions
                        ? "bg-[#F34A23] hover:bg-[#E04420] text-white"
                        : "bg-white/10 text-white/40 cursor-not-allowed"
                    }`}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Submit Assessment</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  )
}
