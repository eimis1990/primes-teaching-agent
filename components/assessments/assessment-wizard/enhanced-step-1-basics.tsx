"use client"

import { useState, useEffect } from "react"
import { FileText, BookOpen, Sparkles } from "lucide-react"
import { TopicSelector } from "../topic-selector"
import type { AssessmentType, WizardStep1Data } from "@/lib/types/assessments"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface EnhancedStep1BasicsProps {
  data: WizardStep1Data
  onChange: (data: WizardStep1Data) => void
}

export function EnhancedStep1Basics({ data, onChange }: EnhancedStep1BasicsProps) {
  const [assessmentTypes, setAssessmentTypes] = useState<AssessmentType[]>([])
  const [loadingTypes, setLoadingTypes] = useState(true)

  useEffect(() => {
    loadAssessmentTypes()
  }, [])

  const loadAssessmentTypes = async () => {
    setLoadingTypes(true)
    try {
      const response = await fetch("/api/assessments/types")
      const result = await response.json()

      if (response.ok) {
        setAssessmentTypes(result.data || [])
      }
    } catch (error) {
      console.error("Error loading assessment types:", error)
    } finally {
      setLoadingTypes(false)
    }
  }

  const selectedType = assessmentTypes.find((t) => t.id === data.assessment_type_id)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-[#F34A23]" />
          Basic Information
        </h2>
        <p className="text-white/60 mt-1.5">
          Let's start by setting up the foundation of your assessment
        </p>
      </div>

      <Separator className="bg-white/10" />

      {/* Title and Type - Side by Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Assessment Title */}
        <div className="space-y-2 rounded-xl border border-white/[0.08] bg-[#23242a]/70 p-4">
          <Label className="text-white/80 text-sm flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-[#F34A23]" />
            Assessment Title
          </Label>
          <Input
            type="text"
            value={data.title}
            onChange={(e) => onChange({ ...data, title: e.target.value })}
            placeholder="e.g., Q1 Performance Review"
            className="bg-[#252525] border-white/10 text-white placeholder:text-white/30 focus:border-[#F34A23] focus:ring-[#F34A23]/20 h-10"
          />
          <p className="text-xs text-white/35">Choose a title employees will immediately recognize.</p>
        </div>

        {/* Assessment Type */}
        <div className="space-y-2 rounded-xl border border-white/[0.08] bg-[#23242a]/70 p-4">
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="border-white/20 text-white/50 text-xs px-1.5 py-0">
              Optional
            </Badge>
            <Label className="text-white/80 text-sm">
              Assessment Type
            </Label>
          </div>
          <Select
            value={data.assessment_type_id}
            onValueChange={(value) => onChange({ ...data, assessment_type_id: value })}
            disabled={loadingTypes}
          >
            <SelectTrigger className="bg-[#252525] border-white/10 text-white h-10">
              <SelectValue placeholder={loadingTypes ? "Loading..." : "Select type"}>
                {selectedType && (
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: selectedType.color }}
                    />
                    <span>{selectedType.name}</span>
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-[#1B1C20] border-white/10">
              <SelectItem value="none" className="text-white/60">
                None
              </SelectItem>
              {assessmentTypes.map((type) => (
                <SelectItem key={type.id} value={type.id} className="text-white">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: type.color }}
                    />
                    <span>{type.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-white/35">Use types to keep reporting and filtering organized.</p>
        </div>
      </div>

      {/* Topic Selection */}
      <div className="space-y-2.5 rounded-xl border border-white/[0.08] bg-[#23242a]/70 p-4 md:p-5">
        <div className="flex items-center justify-between">
          <Label className="text-white/80 text-sm flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-[#F34A23]" />
            Select Topics
          </Label>
          {data.topic_ids.length > 0 && (
            <Badge className="bg-[#F34A23] text-white border-0 text-xs">
              {data.topic_ids.length} selected
            </Badge>
          )}
        </div>
        <TopicSelector
          selectedTopicIds={data.topic_ids}
          onSelectionChange={(topic_ids) => onChange({ ...data, topic_ids })}
        />
      </div>
    </div>
  )
}
