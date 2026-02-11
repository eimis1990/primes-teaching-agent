"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import { EnhancedWizardSteps } from "./enhanced-wizard-steps"
import { EnhancedStep1Basics } from "./enhanced-step-1-basics"
import { EnhancedStep2Employee } from "./enhanced-step-2-employee"
import { Step3Review } from "./step-3-review"
import type { WizardStep1Data, WizardStep2Data, WizardStep3Data, AssessmentQuestion } from "@/lib/types/assessments"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
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

const STEPS = [
  { 
    number: 1, 
    label: "Basic Info",
    description: "Title & topics"
  },
  { 
    number: 2, 
    label: "Select Employee",
    description: "Who takes this"
  },
  { 
    number: 3, 
    label: "Configure & Generate",
    description: "Questions & settings"
  },
]

interface GenerationProgress {
  current: number
  total: number
  topicName: string
  topicId: string
  completedTopics: string[]
  errors: Array<{ topicId: string; message: string }>
}

export function EnhancedAssessmentWizard() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedQuestions, setGeneratedQuestions] = useState<AssessmentQuestion[]>([])
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress | null>(null)
  const [selectedQuestionIndices, setSelectedQuestionIndices] = useState<number[]>([])
  const [selectedLibraryQuestionIds, setSelectedLibraryQuestionIds] = useState<string[]>([])
  const [showCancelDialog, setShowCancelDialog] = useState(false)

  // Step data
  const [step1Data, setStep1Data] = useState<WizardStep1Data>({
    title: "",
    assessment_type_id: "",
    topic_ids: [],
  })
  const [step2Data, setStep2Data] = useState<WizardStep2Data>({
    employee_id: "",
  })
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null)
  const [step3Data, setStep3Data] = useState<WizardStep3Data>({
    due_date: "",
    difficulty: "medium",
    passing_score: 70,
    questions_per_topic: 5,
  })

  const canProceedFromStep1 = step1Data.title.trim() !== "" && step1Data.topic_ids.length > 0
  const canProceedFromStep2 = step2Data.employee_id !== ""
  const canSubmit = generatedQuestions.length > 0 || selectedLibraryQuestionIds.length > 0

  const handleGenerateQuestions = async () => {
    setIsGenerating(true)
    setGenerationProgress({
      current: 0,
      total: step1Data.topic_ids.length,
      topicName: "",
      topicId: "",
      completedTopics: [],
      errors: [],
    })
    
    try {
      const response = await fetch("/api/assessments/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic_ids: step1Data.topic_ids,
          difficulty: step3Data.difficulty,
          questions_per_topic: step3Data.questions_per_topic,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate questions")
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error("No response body")
      }

      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6))

            switch (data.type) {
              case "progress":
                setGenerationProgress(prev => ({
                  current: data.current,
                  total: data.total,
                  topicName: data.topicName,
                  topicId: data.topicId,
                  completedTopics: prev?.completedTopics || [],
                  errors: prev?.errors || [],
                }))
                break

              case "topic_complete":
                setGenerationProgress(prev => ({
                  ...prev!,
                  completedTopics: [...(prev?.completedTopics || []), data.topicId],
                }))
                toast.success(`Generated ${data.questionsGenerated} questions for ${data.topicName}`)
                break

              case "warning":
                toast.warning(data.message)
                break

              case "error":
                setGenerationProgress(prev => ({
                  ...prev!,
                  errors: [...(prev?.errors || []), { topicId: data.topicId, message: data.message }],
                }))
                toast.error(data.message)
                break

              case "complete":
                setGeneratedQuestions(data.questions || [])
                toast.success(`Successfully generated ${data.total} questions!`)
                break

              case "fatal_error":
                throw new Error(data.message)
            }
          }
        }
      }
    } catch (error) {
      console.error("Error generating questions:", error)
      toast.error(error instanceof Error ? error.message : "Failed to generate questions")
    } finally {
      setIsGenerating(false)
      setGenerationProgress(null)
    }
  }

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast.error("Please select questions first")
      return
    }

    // Combine both generated AND library questions
    let questionsToSubmit: any[] = []

    // Add selected generated questions
    if (selectedQuestionIndices.length > 0) {
      const selectedGenerated = generatedQuestions
        .filter((_, idx) => selectedQuestionIndices.includes(idx))
        .map((q, idx) => ({
          ...q,
          order_index: idx,
        }))
      questionsToSubmit.push(...selectedGenerated)
      console.log(`📝 Adding ${selectedGenerated.length} generated questions`)
    }

    // Add selected library questions
    if (selectedLibraryQuestionIds.length > 0) {
      try {
        const response = await fetch(
          `/api/question-library?topic_ids=${step1Data.topic_ids.join(",")}`
        )
        const result = await response.json()
        if (response.ok) {
          // Filter only selected questions and convert to assessment question format
          const selectedLibrary = result.data
            .filter((q: any) => selectedLibraryQuestionIds.includes(q.id))
            .map((q: any, idx: number) => ({
              question_text: q.question_text,
              question_type: q.question_type,
              options: q.options,
              correct_answer: q.correct_answer,
              expected_keywords: q.expected_keywords,
              explanation: q.explanation,
              difficulty: q.difficulty,
              points: q.points,
              source_chunk_text: q.source_chunk_text,
              topic_id: q.topic_id,
              order_index: questionsToSubmit.length + idx,
            }))
          questionsToSubmit.push(...selectedLibrary)
          console.log(`📚 Adding ${selectedLibrary.length} library questions`)
        }
      } catch (error) {
        console.error("Error fetching library questions:", error)
        toast.error("Failed to fetch selected questions")
        return
      }
    }

    if (questionsToSubmit.length === 0) {
      toast.error("Please select at least one question")
      return
    }

    console.log(`✅ Total questions to submit: ${questionsToSubmit.length}`)

    setIsSubmitting(true)
    try {
      const response = await fetch("/api/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: step1Data.title,
          assessment_type_id: step1Data.assessment_type_id || null,
          employee_id: step2Data.employee_id,
          topic_ids: step1Data.topic_ids,
          difficulty: step3Data.difficulty,
          passing_score: step3Data.passing_score,
          questions_per_topic: step3Data.questions_per_topic,
          due_date: step3Data.due_date || null,
          questions: questionsToSubmit,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to create assessment")
      }

      toast.success("Draft created! Review and send to employee")
      router.push(`/assessments/${result.data.id}`)
    } catch (error) {
      console.error("Error creating assessment:", error)
      toast.error(error instanceof Error ? error.message : "Failed to create assessment")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNext = () => {
    if (currentStep === 1 && !canProceedFromStep1) {
      toast.error("Please fill in all required fields")
      return
    }
    if (currentStep === 2 && !canProceedFromStep2) {
      toast.error("Please select an employee")
      return
    }
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Steps indicator */}
      <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#1B1C20] via-[#1A1B1F] to-[#15161A] px-5 py-6 md:px-7 md:py-7 shadow-xl">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-white/40">Assessment Builder</p>
            <p className="text-sm text-white/60 mt-1">Complete 3 steps to create and assign your draft.</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#F34A23]/30 bg-[#F34A23]/10 px-3 py-1.5 text-xs text-[#ff9a84]">
            <Sparkles className="w-3.5 h-3.5" />
            Step {currentStep} of {STEPS.length}
          </div>
        </div>
        <EnhancedWizardSteps currentStep={currentStep} steps={STEPS} />
      </div>

      {/* Step content */}
      <Card className="overflow-hidden border-white/[0.08] bg-gradient-to-b from-[#1B1C20] to-[#16171B] shadow-2xl shadow-black/25">
        <div className="px-6 md:px-8 pt-4 md:pt-5 pb-6 md:pb-8">
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <EnhancedStep1Basics data={step1Data} onChange={setStep1Data} />
              </motion.div>
            )}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <EnhancedStep2Employee 
                  data={step2Data} 
                  onChange={setStep2Data}
                  onEmployeeSelect={setSelectedEmployee}
                />
              </motion.div>
            )}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <Step3Review
                  step1Data={step1Data}
                  step2Data={step2Data}
                  step3Data={step3Data}
                  onChange={setStep3Data}
                  generatedQuestions={generatedQuestions}
                  isGenerating={isGenerating}
                  generationProgress={generationProgress}
                  onGenerateQuestions={handleGenerateQuestions}
                  selectedQuestionIndices={selectedQuestionIndices}
                  onQuestionSelectionChange={setSelectedQuestionIndices}
                  selectedLibraryQuestionIds={selectedLibraryQuestionIds}
                  onLibraryQuestionSelectionChange={setSelectedLibraryQuestionIds}
                  selectedEmployee={selectedEmployee}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation Footer */}
        <div className="border-t border-white/[0.08] px-6 md:px-8 py-4 bg-[#141519]/85 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <Button
              onClick={handleBack}
              disabled={currentStep === 1}
              variant="outline"
              className="border-white/10 bg-transparent text-white hover:bg-white/5 disabled:opacity-30"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            <div className="flex items-center gap-3">
              <Button
                onClick={() => setShowCancelDialog(true)}
                variant="outline"
                className="border-white/10 bg-transparent text-white/60 hover:text-white hover:bg-white/5"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>

              {currentStep < 3 ? (
                <Button
                  onClick={handleNext}
                  disabled={
                    (currentStep === 1 && !canProceedFromStep1) ||
                    (currentStep === 2 && !canProceedFromStep2)
                  }
                  className="bg-[#F34A23] hover:bg-[#E04420] disabled:opacity-50 text-white px-8 shadow-lg shadow-[#F34A23]/20"
                >
                  Next Step
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={!canSubmit || isSubmitting}
                  className="bg-[#F34A23] hover:bg-[#E04420] disabled:opacity-50 text-white px-8 shadow-lg shadow-[#F34A23]/20"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Create Draft
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent className="bg-[#1B1C20] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Cancel Assessment Creation?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Are you sure you want to cancel? All progress will be lost and this action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-white/10 text-white hover:bg-white/5">
              Continue Editing
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => router.push("/assessments")}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Yes, Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
