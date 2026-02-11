"use client"

import { use, useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { SidebarLayout } from "@/components/layouts/sidebar-layout"
import { Filter, Settings, MessageSquare } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { useProjects } from "@/contexts/project-context"
import { MessageList, type ChatMessage } from "@/components/chat/message-list"
import { ChatInput } from "@/components/chat/chat-input"
import { motion } from "framer-motion"

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: topicId } = use(params)
  const { user } = useAuth()
  const { getProject } = useProjects()
  const router = useRouter()
  
  const project = getProject(topicId)
  
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [mode, setMode] = useState<'normal' | 'operational'>('normal')
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Load most recent conversation for this topic
  useEffect(() => {
    const loadConversationHistory = async () => {
      if (!user || !topicId) return
      
      try {
        setIsLoadingHistory(true)
        
        // Get the most recent conversation for this topic from Supabase
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        
        const { data: conversations, error } = await supabase
          .from('conversations')
          .select('id, title, created_at, updated_at')
          .contains('topic_ids', [topicId])
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(1)
        
        if (error) {
          console.error('Error loading conversations:', error)
          setIsLoadingHistory(false)
          return
        }
        
        if (conversations && conversations.length > 0) {
          const conv = conversations[0]
          setConversationId(conv.id)
          
          // Load messages for this conversation
          const response = await fetch(`/api/chat?conversationId=${conv.id}`)
          const data = await response.json()
          
          if (data.messages) {
            setMessages(data.messages)
            console.log(`✅ Loaded ${data.messages.length} messages from conversation: ${conv.title}`)
          }
        }
      } catch (error) {
        console.error('Error loading conversation history:', error)
      } finally {
        setIsLoadingHistory(false)
      }
    }
    
    loadConversationHistory()
  }, [user, topicId])
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  const handleSendMessage = async (message: string) => {
    if (!user) return
    
    // Add user message to UI immediately
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      createdAt: new Date().toISOString()
    }
    
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          conversationId,
          topicIds: [topicId],
          mode,
          stream: true
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to send message')
      }
      
      // Get conversation ID from headers
      const convId = response.headers.get('X-Conversation-Id')
      if (convId && !conversationId) {
        setConversationId(convId)
      }
      
      // Stream the response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      
      let assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString()
      }
      
      setMessages(prev => [...prev, assistantMessage])
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          
          const chunk = decoder.decode(value, { stream: true })
          assistantMessage.content += chunk
          
          // Update the last message
          setMessages(prev => {
            const newMessages = [...prev]
            newMessages[newMessages.length - 1] = { ...assistantMessage }
            return newMessages
          })
        }
      }
      
      setIsLoading(false)
    } catch (error) {
      console.error('Error sending message:', error)
      setIsLoading(false)
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        createdAt: new Date().toISOString()
      }
      setMessages(prev => [...prev, errorMessage])
    }
  }
  
  if (!project) {
    return (
      <SidebarLayout breadcrumbs={[
        { label: "Knowledge Base", href: "/knowledge-base" }
      ]}>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <h2 className="text-xl mb-4 text-white/60">Topic not found</h2>
            <button onClick={() => router.push("/knowledge-base")} className="px-4 py-2 bg-white text-black rounded-lg">
              Go to Knowledge Base
            </button>
          </div>
        </div>
      </SidebarLayout>
    )
  }
  
  return (
    <SidebarLayout breadcrumbs={[
      { label: "Knowledge Base", href: "/knowledge-base" },
      { label: project.title, href: `/project/${topicId}` },
      { label: "Chat" }
    ]}>
      <div className="flex flex-col h-[calc(100vh-3.5rem)] -m-6">
        {/* Header with mode selector */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h1 className="text-2xl font-semibold text-white">Chat</h1>
            <p className="text-sm text-white/40 mt-1">Ask questions about this topic</p>
          </div>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as 'normal' | 'operational')}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="normal">Normal Mode</option>
            <option value="operational">Operational Mode (Concise)</option>
          </select>
        </div>
        
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto w-full relative">
        <div className="max-w-7xl mx-auto w-full min-h-full flex flex-col">
          {isLoadingHistory ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-4 animate-pulse">
                  <MessageSquare size={32} className="text-purple-400" />
                </div>
                <p className="text-white/60">Loading conversation history...</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center max-w-md mx-auto">
                <div className="w-20 h-20 rounded-full bg-purple-500/20 flex items-center justify-center mx-auto mb-6">
                  <Settings size={40} className="text-purple-400" />
                </div>
                <h2 className="text-2xl font-bold mb-3">Start a Conversation</h2>
                <p className="text-white/60 mb-6">
                  Ask questions about the documents in this topic. I'll search through your knowledge base and provide accurate answers with sources.
                </p>
                <div className="space-y-2 text-sm text-white/50 text-left bg-white/5 rounded-lg p-4">
                  <p className="font-medium text-white/70 mb-2">Example questions:</p>
                  <p>• "What are the key principles in this topic?"</p>
                  <p>• "Summarize the main concepts"</p>
                  <p>• "How do I handle [specific scenario]?"</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 p-6 md:p-8">
              <MessageList messages={messages} isLoading={isLoading} />
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>
        
        {/* Input Area */}
        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={isLoading}
          placeholder={isLoading ? "AI is thinking..." : "Ask a question..."}
        />
      </div>
    </SidebarLayout>
  )
}
