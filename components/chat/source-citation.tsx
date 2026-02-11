"use client"

import { FileText, ChevronDown, ChevronUp } from "lucide-react"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface SourceCitationProps {
  source: {
    documentId: string
    documentTitle: string
    chunkText: string
    topicId: string
    topicTitle?: string
  }
  index: number
}

export function SourceCitation({ source, index }: SourceCitationProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  return (
    <div className="border border-white/10 rounded-lg bg-white/5 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0">
            <FileText size={16} />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-white/90">
              [{index}] {source.documentTitle}
            </p>
            {source.topicTitle && (
              <p className="text-xs text-white/50">
                Topic: {source.topicTitle}
              </p>
            )}
          </div>
        </div>
        {isExpanded ? <ChevronUp size={16} className="text-white/50" /> : <ChevronDown size={16} className="text-white/50" />}
      </button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-white/10"
          >
            <div className="px-4 py-3 text-sm text-white/70 leading-relaxed">
              {source.chunkText}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
