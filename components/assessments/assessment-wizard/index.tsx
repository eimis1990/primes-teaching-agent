"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import { WizardSteps } from "./wizard-steps"
import { Step1Basics } from "./step-1-basics"
import { Step2Employee } from "./step-2-employee"
import { Step3Review } from "./step-3-review"
import type { WizardStep1Data, WizardStep2Data, WizardStep3Data, AssessmentQuestion } from "@/lib/types/assessments"

const STEPS = [
  { number: 1, label: "Select Topics" },
  { number: 2, label: "Select Employee" },
  { number: 3, label: "Review" },
]

interface GenerationProgress {
  current: number
  total: number
  topicName: string
  topicId: string
  completedTopics: string[]
  errors: Array<{ topicId: string; message: string }>
}

export function AssessmentWizard() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedQuestions, setGeneratedQuestions] = useState<AssessmentQuestion[]>([])
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress | null>(null)
  const [selectedQuestionIndices, setSelectedQuestionIndices] = useState<number[]>([])
  const [selectedLibraryQuestionIds, setSelectedLibraryQuestionIds] = useState<string[]>([])

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
    <div className="max-w-4xl mx-auto">
      {/* Steps indicator */}
      <div className="mb-8">
        <WizardSteps currentStep={currentStep} steps={STEPS} />
      </div>

      {/* Step content */}
      <div className="bg-[#1B1C20] rounded-2xl border border-white/[0.08] p-8">
        <AnimatePresence mode="wait">
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <Step1Basics data={step1Data} onChange={setStep1Data} />
            </motion.div>
          )}
          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <Step2Employee 
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
              transition={{ duration: 0.2 }}
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

      {/* Navigation buttons */}
      <div className="flex items-center justify-between mt-6">
        <button
          onClick={handleBack}
          disabled={currentStep === 1}
          className="flex items-center gap-2 px-4 py-2 text-white/60 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/assessments")}
            className="px-4 py-2 text-white/60 hover:text-white transition-colors"
          >
            Cancel
          </button>

          {currentStep < 3 ? (
            <button
              onClick={handleNext}
              disabled={
                (currentStep === 1 && !canProceedFromStep1) ||
                (currentStep === 2 && !canProceedFromStep2)
              }
              className="flex items-center gap-2 px-6 py-2 bg-[#F34A23] hover:bg-[#E04420] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              <span>Next Step</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              className="flex items-center gap-2 px-6 py-2 bg-[#F34A23] hover:bg-[#E04420] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Create Draft</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
