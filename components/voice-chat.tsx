"use client"

import { useState, useEffect, useRef } from "react"
import { Mic, Square, PhoneOff, Volume2, VolumeX } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface VoiceChatProps {
  topicIds: string[]
  onClose: () => void
}

export function VoiceChat({ topicIds, onClose }: VoiceChatProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [transcript, setTranscript] = useState<Array<{
    role: 'user' | 'agent'
    text: string
    timestamp: Date
  }>>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const transcriptEndRef = useRef<HTMLDivElement>(null)
  
  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript])
  
  // Start voice session
  const startSession = async () => {
    setIsConnecting(true)
    setError(null)
    
    try {
      const response = await fetch('/api/voice/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicIds })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to start session')
      }
      
      const data = await response.json()
      setSessionId(data.sessionId)
      setIsConnected(true)
      
      // Add welcome message
      setTranscript([{
        role: 'agent',
        text: 'Hello! I\'m your AI teaching assistant. How can I help you learn today?',
        timestamp: new Date()
      }])
    } catch (err) {
      console.error('Error starting voice session:', err)
      setError(err instanceof Error ? err.message : 'Failed to start voice session')
    } finally {
      setIsConnecting(false)
    }
  }
  
  // End voice session
  const endSession = async () => {
    if (!sessionId) return
    
    try {
      await fetch(`/api/voice/session?sessionId=${sessionId}`, {
        method: 'DELETE'
      })
    } catch (err) {
      console.error('Error ending session:', err)
    } finally {
      setIsConnected(false)
      setSessionId(null)
    }
  }
  
  // Toggle mute
  const toggleMute = () => {
    setIsMuted(!isMuted)
    // In a real implementation, this would mute the microphone
  }
  
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#1e1e1e] rounded-2xl border border-white/10 overflow-hidden max-w-2xl w-full max-h-[80vh] flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Voice Chat</h2>
            <p className="text-sm text-white/50">
              {isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Not connected'}
            </p>
          </div>
          <button
            onClick={isConnected ? endSession : onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          >
            <PhoneOff size={20} />
          </button>
        </div>
        
        {/* Transcript / Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {!isConnected && !isConnecting ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-24 h-24 rounded-full bg-purple-500/20 flex items-center justify-center mb-6">
                <Mic size={48} className="text-purple-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Start Voice Conversation</h3>
              <p className="text-white/60 mb-6 max-w-md">
                Have a natural conversation with your AI teaching assistant. Ask questions about your knowledge base and get instant voice responses.
              </p>
              {error && (
                <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm max-w-md">
                  {error}
                </div>
              )}
              <button
                onClick={startSession}
                disabled={isConnecting}
                className="px-8 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-full font-medium transition-colors disabled:opacity-50"
              >
                {isConnecting ? 'Connecting...' : 'Start Voice Chat'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {transcript.map((entry, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] ${
                    entry.role === 'user'
                      ? 'bg-blue-500/20 text-blue-100'
                      : 'bg-purple-500/20 text-purple-100'
                  } rounded-2xl px-4 py-3`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium opacity-70">
                        {entry.role === 'user' ? 'You' : 'AI Assistant'}
                      </span>
                      <span className="text-xs opacity-50">
                        {entry.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed">{entry.text}</p>
                  </div>
                </motion.div>
              ))}
              <div ref={transcriptEndRef} />
            </div>
          )}
        </div>
        
        {/* Controls (when connected) */}
        {isConnected && (
          <div className="px-6 py-4 border-t border-white/10 bg-[#151515]">
            <div className="flex items-center justify-center gap-6">
              {/* Mute Button */}
              <button
                onClick={toggleMute}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                  isMuted
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                }`}
              >
                {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
              </button>
              
              {/* Microphone Indicator */}
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-purple-500 flex items-center justify-center">
                  <Mic size={32} className="text-white" />
                </div>
                <motion.div
                  className="absolute inset-0 rounded-full bg-purple-500/30"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 0.2, 0.5]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              </div>
              
              {/* End Call Button */}
              <button
                onClick={endSession}
                className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-colors"
              >
                <PhoneOff size={24} />
              </button>
            </div>
            
            <p className="text-center text-xs text-white/40 mt-4">
              Speak naturally - the AI will respond in real-time
            </p>
          </div>
        )}
      </motion.div>
    </div>
  )
}
