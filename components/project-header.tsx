"use client"

import { useRouter, usePathname } from "next/navigation"
import { ArrowLeft, FileText, MessageSquare, BookOpen, ClipboardCheck } from "lucide-react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface ProjectHeaderProps {
  projectId: string
  projectTitle: string
  subTitle?: string
  className?: string
  rightContent?: React.ReactNode
}

export function ProjectHeader({ projectId, projectTitle, subTitle, className, rightContent }: ProjectHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()

  const tabs = [
    { id: "documents", label: "Documents", icon: FileText, path: `/project/${projectId}` },
    { id: "chat", label: "Chat", icon: MessageSquare, path: `/project/${projectId}/chat` },
    { id: "questions", label: "Questions", icon: BookOpen, path: `/project/${projectId}/questions` },
    { id: "exam", label: "Take Exam", icon: ClipboardCheck, path: `/project/${projectId}/exam` },
  ]

  return (
    <div className={cn("border-b border-white/10 bg-[#151515] sticky top-0 z-10 backdrop-blur-xl bg-[#151515]/80 supports-[backdrop-filter]:bg-[#151515]/60", className)}>
      <div className="max-w-7xl mx-auto">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/knowledge-base")}
              className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold tracking-tight">{projectTitle}</h1>
              {subTitle && <p className="text-sm text-white/50">{subTitle}</p>}
            </div>
          </div>
          {rightContent}
        </div>

        <div className="px-6 flex gap-8 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const isActive = pathname === tab.path
            return (
              <button
                key={tab.id}
                onClick={() => router.push(tab.path)}
                className={cn(
                  "group relative flex items-center gap-2 pb-4 pt-2 text-sm font-medium transition-colors whitespace-nowrap",
                  isActive ? "text-white" : "text-white/60 hover:text-white"
                )}
              >
                <tab.icon size={16} className={cn("transition-colors", isActive ? "text-[#F34A23]" : "group-hover:text-white")} />
                {tab.label}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F34A23] shadow-[0_0_10px_rgba(243,74,35,0.5)]"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
