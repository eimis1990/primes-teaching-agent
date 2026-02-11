"use client"

import { useState, useEffect } from "react"
import { ChevronDown } from "lucide-react"
import { TopicSelector } from "../topic-selector"
import type { AssessmentType, WizardStep1Data } from "@/lib/types/assessments"

interface Step1BasicsProps {
  data: WizardStep1Data
  onChange: (data: WizardStep1Data) => void
}

export function Step1Basics({ data, onChange }: Step1BasicsProps) {
  const [assessmentTypes, setAssessmentTypes] = useState<AssessmentType[]>([])
  const [loadingTypes, setLoadingTypes] = useState(true)
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false)

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
    <div className="space-y-8">
      {/* Title */}
      <div>
        <label className="block text-sm text-white/60 mb-2">Assessment Title *</label>
        <input
          type="text"
          value={data.title}
          onChange={(e) => onChange({ ...data, title: e.target.value })}
          placeholder="Q1 Performance Review"
          className="w-full bg-[#252525] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-white/20 transition-colors placeholder:text-white/20"
        />
      </div>

      {/* Assessment Type */}
      <div>
        <label className="block text-sm text-white/60 mb-2">Assessment Type</label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setTypeDropdownOpen(!typeDropdownOpen)}
            className="w-full flex items-center justify-between bg-[#252525] border border-white/10 rounded-lg px-4 py-3 text-left focus:outline-none focus:border-white/20 transition-colors"
          >
            {loadingTypes ? (
              <span className="text-white/40">Loading types...</span>
            ) : selectedType ? (
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: selectedType.color }}
                />
                <span className="text-white">{selectedType.name}</span>
              </div>
            ) : (
              <span className="text-white/40">Select a type (optional)</span>
            )}
            <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${typeDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {typeDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[#1B1C20] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
              <div className="p-1 max-h-60 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => {
                    onChange({ ...data, assessment_type_id: "" })
                    setTypeDropdownOpen(false)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left text-white/60"
                >
                  <span>None</span>
                </button>
                {assessmentTypes.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => {
                      onChange({ ...data, assessment_type_id: type.id })
                      setTypeDropdownOpen(false)
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left ${
                      data.assessment_type_id === type.id ? "bg-white/5" : ""
                    }`}
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: type.color }}
                    />
                    <div>
                      <span className="text-white">{type.name}</span>
                      {type.description && (
                        <p className="text-white/40 text-xs">{type.description}</p>
                      )}
                    </div>
                  </button>
                ))}
                {assessmentTypes.length === 0 && !loadingTypes && (
                  <p className="px-3 py-2 text-white/40 text-sm">
                    No assessment types created yet
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
        <p className="text-white/30 text-xs mt-1">
          You can create assessment types in Settings
        </p>
      </div>

      {/* Topic Selection */}
      <div>
        <label className="block text-sm text-white/60 mb-4">Select Topics *</label>
        <TopicSelector
          selectedTopicIds={data.topic_ids}
          onSelectionChange={(topic_ids) => onChange({ ...data, topic_ids })}
        />
      </div>
    </div>
  )
}
