"use client"

import { useState, useEffect } from "react"
import { CalendarDays, Gauge, Target, FileText, User, BookOpen, Sparkles, Loader2, CheckCircle2, XCircle, Check, X, Save } from "lucide-react"
import type { WizardStep1Data, WizardStep2Data, WizardStep3Data, AssessmentType, Employee, AssessmentQuestion } from "@/lib/types/assessments"
import { useProjects } from "@/contexts/project-context"
import { Progress } from "@/components/ui/progress"
import { Calendar as DateCalendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface GenerationProgress {
  current: number
  total: number
  topicName: string
  topicId: string
  completedTopics: string[]
  errors: Array<{ topicId: string; message: string }>
}

interface Step3ReviewProps {
  step1Data: WizardStep1Data
  step2Data: WizardStep2Data
  step3Data: WizardStep3Data
  onChange: (data: WizardStep3Data) => void
  generatedQuestions: AssessmentQuestion[]
  isGenerating: boolean
  generationProgress: GenerationProgress | null
  onGenerateQuestions: () => void
  selectedQuestionIndices: number[]
  onQuestionSelectionChange: (indices: number[]) => void
  selectedLibraryQuestionIds: string[]
  onLibraryQuestionSelectionChange: (ids: string[]) => void
  selectedEmployee: Employee | null
}

export function Step3Review({
  step1Data,
  step2Data,
  step3Data,
  onChange,
  generatedQuestions,
  isGenerating,
  generationProgress,
  onGenerateQuestions,
  selectedQuestionIndices,
  onQuestionSelectionChange,
  selectedLibraryQuestionIds,
  onLibraryQuestionSelectionChange,
  selectedEmployee,
}: Step3ReviewProps) {
  const { projects } = useProjects()
  const [assessmentType, setAssessmentType] = useState<AssessmentType | null>(null)
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<number>>(new Set())
  const [isSavingToLibrary, setIsSavingToLibrary] = useState(false)
  const [questionMode, setQuestionMode] = useState<"generate" | "library">("generate")
  const [libraryQuestions, setLibraryQuestions] = useState<any[]>([])
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false)
  const [selectedLibraryQuestions, setSelectedLibraryQuestions] = useState<Set<string>>(new Set())

  // Load assessment type only (employee is passed directly)
  useEffect(() => {
    if (step1Data.assessment_type_id) {
      fetch("/api/assessments/types")
        .then((res) => res.json())
        .then((result) => {
          const type = result.data?.find((t: AssessmentType) => t.id === step1Data.assessment_type_id)
          setAssessmentType(type || null)
        })
        .catch((error) => {
          console.error("Error loading assessment type:", error)
        })
    }
  }, [step1Data.assessment_type_id])

  const selectedTopics = projects.filter((p) => step1Data.topic_ids.includes(p.id))
  const totalQuestions = step1Data.topic_ids.length * step3Data.questions_per_topic
  const pointsPerQuestion = step3Data.difficulty === "easy" ? 5 : step3Data.difficulty === "medium" ? 10 : 15
  const totalPoints = totalQuestions * pointsPerQuestion

  // Initialize all questions as selected
  useEffect(() => {
    if (generatedQuestions.length > 0 && selectedQuestionIds.size === 0) {
      const allIndices = generatedQuestions.map((_, idx) => idx)
      setSelectedQuestionIds(new Set(allIndices))
      onQuestionSelectionChange(allIndices)
    }
  }, [generatedQuestions])

  // Sync internal state with parent
  useEffect(() => {
    setSelectedQuestionIds(new Set(selectedQuestionIndices))
  }, [selectedQuestionIndices])

  const toggleQuestionSelection = (index: number) => {
    const newSet = new Set(selectedQuestionIds)
    if (newSet.has(index)) {
      newSet.delete(index)
    } else {
      newSet.add(index)
    }
    const newIndices = Array.from(newSet)
    setSelectedQuestionIds(newSet)
    onQuestionSelectionChange(newIndices)
  }

  const toggleAllQuestions = () => {
    if (selectedQuestionIds.size === generatedQuestions.length) {
      setSelectedQuestionIds(new Set())
      onQuestionSelectionChange([])
    } else {
      const allIndices = generatedQuestions.map((_, idx) => idx)
      setSelectedQuestionIds(new Set(allIndices))
      onQuestionSelectionChange(allIndices)
    }
  }

  const handleSaveToLibrary = async () => {
    const selectedQuestions = generatedQuestions.filter((_, idx) => 
      selectedQuestionIds.has(idx)
    )

    if (selectedQuestions.length === 0) {
      toast.error("Please select at least one question to save")
      return
    }

    setIsSavingToLibrary(true)
    try {
      const response = await fetch("/api/question-library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questions: selectedQuestions.map(q => ({
            topic_id: q.topic_id,
            question_text: q.question_text,
            question_type: q.question_type,
            options: q.options,
            correct_answer: q.correct_answer,
            expected_keywords: q.expected_keywords,
            explanation: q.explanation,
            difficulty: q.difficulty,
            points: q.points,
            source_chunk_text: q.source_chunk_text,
          }))
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to save questions")
      }

      toast.success(result.message || "Questions saved to library")
    } catch (error) {
      console.error("Error saving to library:", error)
      toast.error(error instanceof Error ? error.message : "Failed to save questions")
    } finally {
      setIsSavingToLibrary(false)
    }
  }

  const loadLibraryQuestions = async () => {
    if (step1Data.topic_ids.length === 0) {
      toast.error("Please select topics first")
      return
    }

    setIsLoadingLibrary(true)
    try {
      const response = await fetch(
        `/api/question-library?topic_ids=${step1Data.topic_ids.join(",")}&difficulty=${step3Data.difficulty}`
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to load questions")
      }

      setLibraryQuestions(result.data || [])
      
      // Check for duplicates with generated questions
      if (generatedQuestions.length > 0 && result.data.length > 0) {
        const duplicateCount = result.data.filter((libQ: any) => 
          generatedQuestions.some(genQ => genQ.question_text === libQ.question_text)
        ).length
        
        if (duplicateCount > 0) {
          toast.warning(`Found ${duplicateCount} question(s) that match your generated questions`)
        }
      }
      
      if (result.data.length === 0) {
        toast.info("No questions found in library for selected topics")
      } else {
        toast.success(`Found ${result.data.length} questions in library`)
      }
    } catch (error) {
      console.error("Error loading library questions:", error)
      toast.error(error instanceof Error ? error.message : "Failed to load questions")
    } finally {
      setIsLoadingLibrary(false)
    }
  }

  const toggleLibraryQuestion = (questionId: string) => {
    const newSet = new Set(selectedLibraryQuestions)
    if (newSet.has(questionId)) {
      newSet.delete(questionId)
    } else {
      newSet.add(questionId)
    }
    const newIds = Array.from(newSet)
    setSelectedLibraryQuestions(newSet)
    onLibraryQuestionSelectionChange(newIds)
  }

  const toggleAllLibraryQuestions = () => {
    if (selectedLibraryQuestions.size === libraryQuestions.length) {
      setSelectedLibraryQuestions(new Set())
      onLibraryQuestionSelectionChange([])
    } else {
      const allIds = libraryQuestions.map(q => q.id)
      setSelectedLibraryQuestions(new Set(allIds))
      onLibraryQuestionSelectionChange(allIds)
    }
  }

  // Sync library questions with parent
  useEffect(() => {
    setSelectedLibraryQuestions(new Set(selectedLibraryQuestionIds))
  }, [selectedLibraryQuestionIds])

  // Load library questions when switching to library mode
  useEffect(() => {
    if (questionMode === "library" && libraryQuestions.length === 0) {
      loadLibraryQuestions()
    }
  }, [questionMode])

  const formatDateForStorage = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  const formatDateLabel = (dateString?: string) => {
    if (!dateString) return "Select due date"
    const date = new Date(`${dateString}T00:00:00`)
    if (Number.isNaN(date.getTime())) return "Select due date"
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date)
  }

  const selectedDueDate = step3Data.due_date
    ? new Date(`${step3Data.due_date}T00:00:00`)
    : undefined

  return (
    <div className="space-y-4 -mt-1">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-[#F34A23]" />
          Configure & Generate
        </h2>
        <p className="text-white/60 mt-1.5">
          Review your selections and configure the assessment
        </p>
      </div>

      {/* Summary */}
      <div className="rounded-xl p-5 border border-white/[0.08] bg-gradient-to-br from-[#262830] to-[#1d1f25]">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-stretch">
          <div className="rounded-xl border border-white/[0.08] bg-[#1B1C20]/70 px-4 py-3.5">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 w-9 h-9 rounded-lg bg-[#F34A23]/15 border border-[#F34A23]/20 flex items-center justify-center">
                <FileText className="w-4 h-4 text-[#F34A23]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-white font-semibold text-lg leading-tight truncate">
                    {step1Data.title || "Untitled Assessment"}
                  </p>
                  {assessmentType && (
                    <div className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 bg-white/5 border border-white/10 flex-shrink-0">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: assessmentType.color }} />
                      <span className="text-white/60 text-xs">{assessmentType.name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 bg-white/5 border border-white/10 text-white/70">
                <BookOpen className="w-3.5 h-3.5" />
                {selectedTopics.length} {selectedTopics.length === 1 ? "topic" : "topics"}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 bg-white/5 border border-white/10 text-white/70">
                {totalQuestions} questions
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 bg-white/5 border border-white/10 text-white/70">
                {totalPoints} pts total
              </span>
            </div>
          </div>

          {selectedEmployee && (
            <div className="rounded-xl border border-white/[0.08] bg-[#1B1C20]/80 px-4 py-3.5 min-w-[250px]">
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/35 mb-2">Assigned To</p>
              <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-white/10 flex-shrink-0">
                {selectedEmployee.avatar_url ? (
                  <img src={selectedEmployee.avatar_url} alt={selectedEmployee.full_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#F34A23] to-[#E04420] text-white text-sm font-medium">
                    {selectedEmployee.full_name[0]}
                  </div>
                )}
              </div>
                <div className="min-w-0">
                  <p className="text-white font-medium text-sm truncate">{selectedEmployee.full_name}</p>
                  <p className="text-white/40 text-xs truncate">{selectedEmployee.email}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Configuration */}
      <div className="rounded-xl p-5 border border-white/[0.08] bg-[#22242b]/80">
        <h3 className="text-white font-semibold mb-3.5 flex items-center gap-2 text-sm">
          <Gauge className="w-4 h-4 text-[#F34A23]" />
          Configuration
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Due Date */}
          <div className="space-y-1.5 rounded-lg border border-white/[0.08] bg-[#1B1C20] p-3">
            <label className="flex items-center gap-1.5 text-xs text-white/60">
              <CalendarDays className="w-3.5 h-3.5" />
              Due Date
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between bg-[#1B1C20] border-white/10 text-white hover:bg-white/5 hover:text-white"
                >
                  <span className={step3Data.due_date ? "text-white" : "text-white/40"}>
                    {formatDateLabel(step3Data.due_date)}
                  </span>
                  <CalendarDays className="w-4 h-4 text-white/50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-0 border-white/10 bg-[#1B1C20]">
                <DateCalendar
                  mode="single"
                  selected={selectedDueDate}
                  onSelect={(date) =>
                    onChange({
                      ...step3Data,
                      due_date: date ? formatDateForStorage(date) : "",
                    })
                  }
                  className="rounded-lg"
                />
                {step3Data.due_date && (
                  <div className="px-3 pb-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full border-white/10 text-white/70 hover:text-white hover:bg-white/5"
                      onClick={() => onChange({ ...step3Data, due_date: "" })}
                    >
                      Clear due date
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>

          {/* Questions per Topic */}
          <div className="space-y-1.5 rounded-lg border border-white/[0.08] bg-[#1B1C20] p-3">
            <label className="flex items-center gap-1.5 text-xs text-white/60">
              <FileText className="w-3.5 h-3.5" />
              Questions per Topic
            </label>
            <input
              type="number"
              min={1}
              max={20}
              value={step3Data.questions_per_topic}
              onChange={(e) =>
                onChange({
                  ...step3Data,
                  questions_per_topic: Math.max(1, Math.min(20, parseInt(e.target.value) || 5)),
                })
              }
              className="w-full bg-[#1B1C20] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#F34A23] focus:ring-1 focus:ring-[#F34A23]/20 transition-colors text-sm h-9"
            />
          </div>

          {/* Difficulty Level */}
          <div className="space-y-1.5 rounded-lg border border-white/[0.08] bg-[#1B1C20] p-3">
            <label className="flex items-center gap-1.5 text-xs text-white/60">
              <Gauge className="w-3.5 h-3.5" />
              Difficulty Level
            </label>
            <div className="flex gap-2">
              {(["easy", "medium", "hard"] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => onChange({ ...step3Data, difficulty: level })}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    step3Data.difficulty === level
                      ? level === "easy"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : level === "medium"
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                        : "bg-red-500/20 text-red-400 border border-red-500/30"
                      : "bg-[#1B1C20] text-white/60 border border-white/10 hover:border-white/20"
                  }`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Passing Score */}
          <div className="space-y-1.5 rounded-lg border border-white/[0.08] bg-[#1B1C20] p-3">
            <label className="flex items-center gap-1.5 text-xs text-white/60">
              <Target className="w-3.5 h-3.5" />
              Passing Score
            </label>
            <div className="space-y-1.5">
              <input
                type="range"
                min={0}
                max={100}
                value={step3Data.passing_score}
                onChange={(e) =>
                  onChange({ ...step3Data, passing_score: parseInt(e.target.value) })
                }
                className="w-full accent-[#F34A23]"
              />
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/30">0%</span>
                <span className="text-[#F34A23] font-semibold text-sm">{step3Data.passing_score}%</span>
                <span className="text-white/30">100%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Questions Section */}
      <div className="rounded-xl p-6 border border-white/[0.08] bg-[#22242b]/80">
        {/* Mode Tabs */}
        <div className="flex items-center gap-2 mb-6 p-1.5 bg-[#1B1C20] rounded-xl w-fit border border-white/[0.08]">
          <button
            onClick={() => setQuestionMode("generate")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              questionMode === "generate"
                ? "bg-[#F34A23] text-white shadow-md shadow-[#F34A23]/30"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span>Generate New</span>
            </div>
          </button>
          <button
            onClick={() => setQuestionMode("library")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              questionMode === "library"
                ? "bg-[#F34A23] text-white shadow-md shadow-[#F34A23]/30"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              <span>Use From Library</span>
            </div>
          </button>
        </div>

        {/* Generate Mode */}
        {questionMode === "generate" && (
          <>
            <div className="flex items-center justify-between mb-4 rounded-lg border border-white/[0.08] bg-[#1B1C20]/90 p-4">
              <div>
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#F34A23]" />
                  AI Question Generation
                </h3>
                <p className="text-white/40 text-sm mt-1">
                  Generate questions based on your selected topics and difficulty
                </p>
              </div>
              <button
                type="button"
                onClick={onGenerateQuestions}
                disabled={isGenerating}
                className="flex items-center gap-2 px-4 py-2 bg-[#F34A23] hover:bg-[#E04420] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors shadow-md shadow-[#F34A23]/20"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>{generatedQuestions.length > 0 ? "Regenerate" : "Generate Questions"}</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}

        {/* Library Mode */}
        {questionMode === "library" && (
          <>
            <div className="flex items-center justify-between mb-4 rounded-lg border border-white/[0.08] bg-[#1B1C20]/90 p-4">
              <div>
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[#F34A23]" />
                  Question Library
                </h3>
                <p className="text-white/40 text-sm mt-1">
                  Select questions from your saved library
                </p>
              </div>
              <button
                type="button"
                onClick={loadLibraryQuestions}
                disabled={isLoadingLibrary}
                className="flex items-center gap-2 px-4 py-2 bg-[#F34A23] hover:bg-[#E04420] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors shadow-md shadow-[#F34A23]/20"
              >
                {isLoadingLibrary ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Loading...</span>
                  </>
                ) : (
                  <>
                    <BookOpen className="w-4 h-4" />
                    <span>Refresh Library</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}

        {/* Generation Progress */}
        {isGenerating && generationProgress && (
          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">
                  Generating questions for: <span className="text-white font-medium">{generationProgress.topicName}</span>
                </span>
                <span className="text-white/40">
                  {generationProgress.current} / {generationProgress.total}
                </span>
              </div>
              <Progress 
                value={(generationProgress.current / generationProgress.total) * 100} 
                className="h-2"
              />
            </div>

            {/* Topic Status List */}
            <div className="space-y-2">
              {selectedTopics.map((topic) => {
                const isCompleted = generationProgress.completedTopics.includes(topic.id)
                const hasError = generationProgress.errors.some(e => e.topicId === topic.id)
                const isCurrent = generationProgress.topicId === topic.id

                return (
                  <div
                    key={topic.id}
                    className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                      isCurrent ? "bg-[#F34A23]/10 border border-[#F34A23]/20" : "bg-[#1B1C20] border border-white/[0.08]"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    ) : hasError ? (
                      <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    ) : isCurrent ? (
                      <Loader2 className="w-4 h-4 text-[#F34A23] animate-spin flex-shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-white/20 flex-shrink-0" />
                    )}
                    <span className={`text-sm ${
                      isCompleted ? "text-emerald-400" : 
                      hasError ? "text-red-400" : 
                      isCurrent ? "text-white font-medium" : 
                      "text-white/40"
                    }`}>
                      {topic.title}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Generated Questions Preview with Approval */}
        {!isGenerating && generatedQuestions.length > 0 && (
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <p className="text-white/60 text-sm">
                  {generatedQuestions.length} questions generated
                </p>
                <button
                  onClick={toggleAllQuestions}
                  className="text-xs text-[#F34A23] hover:text-[#E04420] transition-colors"
                >
                  {selectedQuestionIds.size === generatedQuestions.length ? "Deselect All" : "Select All"}
                </button>
              </div>
              <button
                onClick={handleSaveToLibrary}
                disabled={selectedQuestionIds.size === 0 || isSavingToLibrary}
                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-medium transition-colors"
              >
                {isSavingToLibrary ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3 h-3" />
                    <span>Save {selectedQuestionIds.size} to Library</span>
                  </>
                )}
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
              {generatedQuestions.map((question, index) => {
                const isSelected = selectedQuestionIds.has(index)
                const topicName = selectedTopics.find(t => t.id === question.topic_id)?.title || "Unknown Topic"

                return (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border transition-all ${
                      isSelected 
                        ? "bg-[#1B1C20] border-[#F34A23]/30 shadow-md shadow-[#F34A23]/10" 
                        : "bg-[#1B1C20]/50 border-white/[0.08] hover:border-white/15"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleQuestionSelection(index)}
                        className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors mt-0.5 ${
                          isSelected
                            ? "bg-[#F34A23] border-[#F34A23]"
                            : "border-white/20 hover:border-white/40"
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </button>

                      <div className="flex-1 space-y-2">
                        {/* Question header */}
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-white text-sm font-medium flex-1">
                            {index + 1}. {question.question_text}
                          </p>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-xs flex-shrink-0 ${
                                question.question_type === "multiple_choice"
                                  ? "bg-blue-500/20 text-blue-400"
                                  : question.question_type === "true_false"
                                  ? "bg-purple-500/20 text-purple-400"
                                  : "bg-emerald-500/20 text-emerald-400"
                              }`}
                            >
                              {question.question_type.replace("_", " ")}
                            </span>
                          </div>
                        </div>

                        {/* Question details */}
                        <div className="flex items-center gap-3 text-xs text-white/40">
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-3 h-3" />
                            {topicName}
                          </span>
                          <span>•</span>
                          <span>{question.points} points</span>
                          <span>•</span>
                          <span className={
                            question.difficulty === "easy" ? "text-emerald-400" :
                            question.difficulty === "hard" ? "text-red-400" :
                            "text-amber-400"
                          }>
                            {question.difficulty}
                          </span>
                        </div>

                        {/* Options for multiple choice */}
                        {question.question_type === "multiple_choice" && question.options && question.options.length > 0 && (
                          <div className="space-y-1 mt-2">
                            {question.options.map((option, optIdx) => (
                              <div
                                key={optIdx}
                                className={`text-xs px-2 py-1 rounded ${
                                  option.isCorrect
                                    ? "bg-emerald-500/10 text-emerald-400"
                                    : "bg-white/5 text-white/60"
                                }`}
                              >
                                {String.fromCharCode(65 + optIdx)}. {option.text}
                                {option.isCorrect && " ✓"}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Explanation */}
                        {question.explanation && (
                          <p className="text-xs text-white/40 italic">
                            💡 {question.explanation}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
              <p className="text-sm text-white/60">
                {selectedQuestionIds.size} of {generatedQuestions.length} generated questions selected
                {selectedLibraryQuestions.size > 0 && (
                  <span className="ml-2">
                    + {selectedLibraryQuestions.size} from library
                  </span>
                )}
              </p>
              <p className="text-sm font-semibold text-[#F34A23]">
                Total: {selectedQuestionIds.size + selectedLibraryQuestions.size} questions
              </p>
            </div>
          </div>
        )}

        {questionMode === "generate" && !isGenerating && generatedQuestions.length === 0 && (
          <p className="text-white/30 text-sm text-center py-4">
            Click "Generate Questions" to preview the AI-generated questions before creating the assessment
          </p>
        )}

        {/* Library Questions Display */}
        {questionMode === "library" && !isLoadingLibrary && (
          <>
            {libraryQuestions.length > 0 ? (
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <p className="text-white/60 text-sm">
                      {libraryQuestions.length} questions available
                    </p>
                    <button
                      onClick={toggleAllLibraryQuestions}
                      className="text-xs text-[#F34A23] hover:text-[#E04420] transition-colors"
                    >
                      {selectedLibraryQuestions.size === libraryQuestions.length ? "Deselect All" : "Select All"}
                    </button>
                  </div>
                  <p className="text-sm text-white/60">
                    {selectedLibraryQuestions.size} selected
                  </p>
                </div>

                <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
                  {libraryQuestions.map((question) => {
                    const isSelected = selectedLibraryQuestions.has(question.id)
                    const topicName = question.topic?.title || "Unknown Topic"
                    
                    // Check if this question is already selected in generated questions
                    const alreadySelectedInGenerated = generatedQuestions.some((genQ, idx) => 
                      selectedQuestionIds.has(idx) && genQ.question_text === question.question_text
                    )

                    return (
                      <div
                        key={question.id}
                        className={`p-4 rounded-lg border transition-all cursor-pointer ${
                          isSelected 
                            ? "bg-[#1B1C20] border-[#F34A23]/30 shadow-md shadow-[#F34A23]/10" 
                            : alreadySelectedInGenerated
                            ? "bg-amber-500/5 border-amber-500/30"
                            : "bg-[#1B1C20]/50 border-white/[0.08] hover:border-white/15"
                        }`}
                        onClick={() => toggleLibraryQuestion(question.id)}
                      >
                        <div className="flex items-start gap-3">
                          {/* Checkbox */}
                          <div
                            className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors mt-0.5 ${
                              isSelected
                                ? "bg-[#F34A23] border-[#F34A23]"
                                : "border-white/20"
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>

                          <div className="flex-1 space-y-2">
                            {/* Question header */}
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-white text-sm font-medium flex-1">
                                {question.question_text}
                              </p>
                              <div className="flex items-center gap-2">
                                {alreadySelectedInGenerated && (
                                  <span className="px-2 py-0.5 rounded text-xs flex-shrink-0 bg-amber-500/20 text-amber-400 flex items-center gap-1">
                                    ⚠️ Already selected
                                  </span>
                                )}
                                <span
                                  className={`px-2 py-0.5 rounded text-xs flex-shrink-0 ${
                                    question.question_type === "multiple_choice"
                                      ? "bg-blue-500/20 text-blue-400"
                                      : question.question_type === "true_false"
                                      ? "bg-purple-500/20 text-purple-400"
                                      : "bg-emerald-500/20 text-emerald-400"
                                  }`}
                                >
                                  {question.question_type.replace("_", " ")}
                                </span>
                              </div>
                            </div>

                            {/* Question details */}
                            <div className="flex items-center gap-3 text-xs text-white/40">
                              <span className="flex items-center gap-1">
                                <BookOpen className="w-3 h-3" />
                                {topicName}
                              </span>
                              <span>•</span>
                              <span>{question.points} points</span>
                              <span>•</span>
                              <span className={
                                question.difficulty === "easy" ? "text-emerald-400" :
                                question.difficulty === "hard" ? "text-red-400" :
                                "text-amber-400"
                              }>
                                {question.difficulty}
                              </span>
                              {question.usage_count > 0 && (
                                <>
                                  <span>•</span>
                                  <span>Used {question.usage_count}x</span>
                                </>
                              )}
                            </div>

                            {/* Options for multiple choice */}
                            {question.question_type === "multiple_choice" && question.options && question.options.length > 0 && (
                              <div className="space-y-1 mt-2">
                                {question.options.map((option: any, optIdx: number) => (
                                  <div
                                    key={optIdx}
                                    className={`text-xs px-2 py-1 rounded ${
                                      option.isCorrect
                                        ? "bg-emerald-500/10 text-emerald-400"
                                        : "bg-white/5 text-white/60"
                                    }`}
                                  >
                                    {String.fromCharCode(65 + optIdx)}. {option.text}
                                    {option.isCorrect && " ✓"}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Explanation */}
                            {question.explanation && (
                              <p className="text-xs text-white/40 italic">
                                💡 {question.explanation}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
                  <p className="text-sm text-white/60">
                    {selectedLibraryQuestions.size} of {libraryQuestions.length} library questions selected
                    {selectedQuestionIds.size > 0 && (
                      <span className="ml-2">
                        + {selectedQuestionIds.size} generated
                      </span>
                    )}
                  </p>
                  <p className="text-sm font-semibold text-[#F34A23]">
                    Total: {selectedQuestionIds.size + selectedLibraryQuestions.size} questions
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-white/30 text-sm text-center py-8">
                No questions found in your library for the selected topics and difficulty.
                <br />
                <span className="text-xs">Try generating some questions and saving them to the library first.</span>
              </p>
            )}
          </>
        )}

        {questionMode === "library" && isLoadingLibrary && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-[#F34A23] animate-spin" />
          </div>
        )}
      </div>
    </div>
  )
}
