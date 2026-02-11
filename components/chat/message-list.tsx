"use client"

import { motion, AnimatePresence } from "framer-motion"
import { User, Bot } from "lucide-react"
import { SourceCitation } from "./source-citation"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'
import 'highlight.js/styles/github-dark.css'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  sources?: Array<{
    documentId: string
    documentTitle: string
    chunkText: string
    topicId: string
    topicTitle?: string
  }>
  createdAt: string
}

interface MessageListProps {
  messages: ChatMessage[]
  isLoading?: boolean
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  return (
    <div className="space-y-6">
      <AnimatePresence mode="popLayout">
        {messages.map((message, index) => {
          if (message.role === 'system') return null
          
          const isUser = message.role === 'user'
          
          return (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="flex gap-4"
            >
              {/* Avatar */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                isUser 
                  ? 'bg-blue-500/20 text-blue-400' 
                  : 'bg-purple-500/20 text-purple-400'
              }`}>
                {isUser ? <User size={20} /> : <Bot size={20} />}
              </div>
              
              {/* Message Content */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white/90">
                    {isUser ? 'You' : 'AI Assistant'}
                  </span>
                  <span className="text-xs text-white/40">
                    {new Date(message.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                
                <div className="prose prose-invert max-w-none prose-sm md:prose-base
                              prose-headings:text-white prose-headings:font-bold
                              prose-p:text-white/80 prose-p:leading-relaxed
                              prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
                              prose-strong:text-white prose-strong:font-semibold
                              prose-code:text-pink-400 prose-code:bg-white/5 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                              prose-pre:bg-[#0d1117] prose-pre:border prose-pre:border-white/10
                              prose-ul:text-white/80 prose-ol:text-white/80
                              prose-li:text-white/80
                              prose-blockquote:border-l-blue-500 prose-blockquote:text-white/70
                              prose-img:rounded-lg prose-img:shadow-xl">
                  {isUser ? (
                    <div className="text-white/80 leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </div>
                  ) : (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeHighlight, rehypeRaw]}
                      components={{
                        // Custom styling for code blocks
                        code: ({node, inline, className, children, ...props}) => {
                          return inline ? (
                            <code className={className} {...props}>
                              {children}
                            </code>
                          ) : (
                            <code className={className} {...props}>
                              {children}
                            </code>
                          )
                        },
                        // Custom styling for links
                        a: ({node, children, ...props}) => (
                          <a {...props} target="_blank" rel="noopener noreferrer">
                            {children}
                          </a>
                        ),
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  )}
                </div>
                
                {/* Sources */}
                {!isUser && message.sources && message.sources.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-medium text-white/50 uppercase tracking-wider">
                      Sources
                    </p>
                    <div className="space-y-2">
                      {message.sources.map((source, idx) => (
                        <SourceCitation
                          key={`${source.documentId}-${idx}`}
                          source={source}
                          index={idx + 1}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )
        })}
        
        {/* Loading indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-4"
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-purple-500/20 text-purple-400">
              <Bot size={20} />
            </div>
            <div className="flex-1 space-y-2">
              <span className="text-sm font-medium text-white/90">AI Assistant</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
