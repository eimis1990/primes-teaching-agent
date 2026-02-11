"use client"

import { useState, useRef, KeyboardEvent } from "react"
import { Send, Mic, Square } from "lucide-react"
import { motion } from "framer-motion"

interface ChatInputProps {
  onSendMessage: (message: string) => void
  disabled?: boolean
  placeholder?: string
  onVoiceToggle?: () => void
  isVoiceActive?: boolean
}

export function ChatInput({ 
  onSendMessage, 
  disabled = false, 
  placeholder = "Ask a question...",
  onVoiceToggle,
  isVoiceActive = false
}: ChatInputProps) {
  const [message, setMessage] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim())
      setMessage("")
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }
  
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }
  
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px'
    }
  }
  
  return (
    <div className="border-t border-white/10 bg-[#151515]">
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-4">
        <div className="flex items-start gap-3">
          {/* Voice Toggle Button (if provided) */}
          {onVoiceToggle && (
            <button
              onClick={onVoiceToggle}
              disabled={disabled}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                isVoiceActive
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
              }`}
            >
              {isVoiceActive ? <Square size={20} fill="currentColor" /> : <Mic size={20} />}
            </button>
          )}
          
          {/* Text Input */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              rows={1}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ minHeight: '48px', maxHeight: '200px' }}
            />
          </div>
          
          {/* Send Button */}
          <motion.button
            onClick={handleSend}
            disabled={disabled || !message.trim()}
            whileTap={{ scale: 0.95 }}
            className="w-12 h-12 rounded-xl bg-purple-500 text-white flex items-center justify-center hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            <Send size={20} />
          </motion.button>
        </div>
        
        <p className="text-xs text-white/40 mt-2 text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
