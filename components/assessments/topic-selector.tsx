"use client"

import { useState, useEffect } from "react"
import { Check, Book, FileText } from "lucide-react"
import { motion } from "framer-motion"
import { useProjects } from "@/contexts/project-context"

interface TopicSelectorProps {
  selectedTopicIds: string[]
  onSelectionChange: (topicIds: string[]) => void
}

export function TopicSelector({ selectedTopicIds, onSelectionChange }: TopicSelectorProps) {
  const { projects, loading } = useProjects()

  const toggleTopic = (topicId: string) => {
    if (selectedTopicIds.includes(topicId)) {
      onSelectionChange(selectedTopicIds.filter((id) => id !== topicId))
    } else {
      onSelectionChange([...selectedTopicIds, topicId])
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-white/60">Loading topics...</div>
      </div>
    )
  }

  // Filter topics with at least one document
  const topicsWithDocuments = projects.filter(project => {
    const documentCount = project.documents?.length || 0
    return documentCount > 0
  })

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 bg-[#1B1C20] rounded-xl border border-white/[0.08]">
        <div className="w-16 h-16 bg-[#35383D] rounded-2xl flex items-center justify-center mb-4">
          <Book className="w-8 h-8 text-white/40" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">No Knowledge Base Topics</h3>
        <p className="text-white/40 text-center max-w-md">
          You need to create at least one topic in your Knowledge Base before you can create an assessment.
        </p>
      </div>
    )
  }

  if (topicsWithDocuments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 bg-[#1B1C20] rounded-xl border border-white/[0.08]">
        <div className="w-16 h-16 bg-[#35383D] rounded-2xl flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-white/40" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">No Topics with Documents</h3>
        <p className="text-white/40 text-center max-w-md">
          Add documents to your topics before creating an assessment.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-white/40">Pick one or more topics that have documents.</p>
        <p className="text-xs text-white/40">{topicsWithDocuments.length} available</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {topicsWithDocuments.map((project) => {
          const isSelected = selectedTopicIds.includes(project.id)
          const documentCount = project.documents?.length || 0

          return (
            <motion.button
              key={project.id}
              onClick={() => toggleTopic(project.id)}
              className={`relative text-left p-4 rounded-xl border transition-all ${
                isSelected
                  ? "bg-[#F34A23]/10 border-[#F34A23]/50 shadow-md shadow-[#F34A23]/10"
                  : "bg-[#252525] border-white/[0.08] hover:border-white/15"
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Selection indicator */}
              <div
                className={`absolute top-3 right-3 w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                  isSelected
                    ? "bg-[#F34A23] text-white"
                    : "bg-white/10 text-transparent"
                }`}
              >
                <Check className="w-4 h-4" />
              </div>

              {/* Topic info */}
              <div className="pr-8">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isSelected ? "bg-[#F34A23]/20" : "bg-white/10"
                    }`}
                  >
                    <Book className={`w-4 h-4 ${isSelected ? "text-[#F34A23]" : "text-white/60"}`} />
                  </div>
                </div>
                <h3 className="text-white font-medium mb-1 line-clamp-2">{project.title}</h3>
                <div className="flex items-center gap-1 text-white/40 text-sm">
                  <FileText className="w-3.5 h-3.5" />
                  <span>
                    {documentCount} {documentCount === 1 ? "document" : "documents"}
                  </span>
                </div>
              </div>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
