"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { motion } from "framer-motion"

export interface QuestionFormData {
  questionText: string
  questionType: 'open_ended' | 'scenario' | 'true_false' | 'multiple_choice'
  expectedKeywords: string[]
  difficulty: 'easy' | 'medium' | 'hard'
  points: number
}

interface QuestionEditorProps {
  onSave: (question: QuestionFormData) => Promise<void>
  onClose: () => void
  initialData?: Partial<QuestionFormData>
}

export function QuestionEditor({ onSave, onClose, initialData }: QuestionEditorProps) {
  const [formData, setFormData] = useState<QuestionFormData>({
    questionText: initialData?.questionText || '',
    questionType: initialData?.questionType || 'open_ended',
    expectedKeywords: initialData?.expectedKeywords || [],
    difficulty: initialData?.difficulty || 'medium',
    points: initialData?.points || 1
  })
  const [keywordInput, setKeywordInput] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  
  const handleAddKeyword = () => {
    if (keywordInput.trim() && !formData.expectedKeywords.includes(keywordInput.trim())) {
      setFormData({
        ...formData,
        expectedKeywords: [...formData.expectedKeywords, keywordInput.trim()]
      })
      setKeywordInput('')
    }
  }
  
  const handleRemoveKeyword = (keyword: string) => {
    setFormData({
      ...formData,
      expectedKeywords: formData.expectedKeywords.filter(k => k !== keyword)
    })
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.questionText.trim()) {
      alert('Please enter a question')
      return
    }
    
    setIsSaving(true)
    try {
      await onSave(formData)
      onClose()
    } catch (error) {
      console.error('Error saving question:', error)
      alert('Failed to save question')
    } finally {
      setIsSaving(false)
    }
  }
  
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#1e1e1e] rounded-2xl border border-white/10 overflow-hidden max-w-2xl w-full max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">
            {initialData ? 'Edit Question' : 'New Question'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Question Text */}
          <div>
            <label className="block text-sm font-medium text-white/90 mb-2">
              Question Text *
            </label>
            <textarea
              value={formData.questionText}
              onChange={(e) => setFormData({ ...formData, questionText: e.target.value })}
              placeholder="Enter your question..."
              rows={4}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              required
            />
          </div>
          
          {/* Question Type */}
          <div>
            <label className="block text-sm font-medium text-white/90 mb-2">
              Question Type
            </label>
            <select
              value={formData.questionType}
              onChange={(e) => setFormData({ ...formData, questionType: e.target.value as any })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="open_ended">Open Ended</option>
              <option value="scenario">Scenario-Based</option>
              <option value="true_false">True/False</option>
              <option value="multiple_choice">Multiple Choice</option>
            </select>
          </div>
          
          {/* Difficulty */}
          <div>
            <label className="block text-sm font-medium text-white/90 mb-2">
              Difficulty Level
            </label>
            <div className="flex gap-3">
              {(['easy', 'medium', 'hard'] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setFormData({ ...formData, difficulty: level })}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    formData.difficulty === level
                      ? 'bg-purple-500 text-white'
                      : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
          </div>
          
          {/* Points */}
          <div>
            <label className="block text-sm font-medium text-white/90 mb-2">
              Points
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={formData.points}
              onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 1 })}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          
          {/* Expected Keywords */}
          <div>
            <label className="block text-sm font-medium text-white/90 mb-2">
              Expected Keywords (for AI validation)
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddKeyword())}
                placeholder="Add a keyword..."
                className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                type="button"
                onClick={handleAddKeyword}
                className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors"
              >
                Add
              </button>
            </div>
            
            {formData.expectedKeywords.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.expectedKeywords.map((keyword, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm flex items-center gap-2"
                  >
                    {keyword}
                    <button
                      type="button"
                      onClick={() => handleRemoveKeyword(keyword)}
                      className="hover:text-blue-100 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </form>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Question'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
