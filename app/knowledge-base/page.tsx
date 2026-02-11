"use client"

import { useState, useMemo, useRef, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { NewProjectSlot } from "@/components/new-project-slot"
import { ProjectFolder } from "@/components/project-folder"
import { Toaster } from "sonner"
import { useProjects } from "@/contexts/project-context"
import { useAuth } from "@/contexts/auth-context"
import { motion } from "framer-motion"
import { SidebarLayout } from "@/components/layouts/sidebar-layout"
import { Search, Bell, Plus } from "lucide-react"

export default function KnowledgeBasePage() {
  const { projects, addProject, removeProject, loading: projectsLoading } = useProjects()
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()

  // Use projects from context instead of local state
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set())

  const mainRef = useRef<HTMLElement>(null)

  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  
  // Map context projects to match the interface expected by the UI
  const allProjects = useMemo(() => {
    const contextProjects = projects.map(p => ({
      ...p,
      // Ensure image array exists
      images: p.images || [],
      // Update clipCount to reflect actual documents (if not mocked "generating" state where we might want to show 0 or progress)
      clipCount: p.documents ? p.documents.length : 0
    }))
    return contextProjects
  }, [projects])

  const handleCreateProject = useCallback(async (name: string) => {
    // Add to Supabase - this will persist the project
    await addProject(name)
  }, [addProject])

  const handleRemoveFolder = useCallback(async (projectId: string) => {
    setRemovingIds((prev) => new Set(prev).add(projectId))
    setTimeout(async () => {
      await removeProject(projectId)
      setRemovingIds((prev) => {
        const next = new Set(prev)
        next.delete(projectId)
        return next
      })
    }, 400)
  }, [removeProject])

  const handleFolderClick = useCallback((projectId: string) => {
    router.push(`/project/${projectId}`)
  }, [router])

  // Redirect to login if not authenticated (only after auth check is complete)
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [authLoading, user, router])

  // Redirect non-admin users to dashboard
  useEffect(() => {
    if (!authLoading && profile && profile.role !== 'admin') {
      router.push('/dashboard')
    }
  }, [authLoading, profile, router])

  // Don't render anything if not authenticated or not authorized (after all hooks are called)
  if (authLoading || !user || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-white/60">Loading...</div>
      </div>
    )
  }

  // Don't render if not admin
  if (profile.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-white/60">Redirecting...</div>
      </div>
    )
  }

  return (
    <SidebarLayout breadcrumbs={[{ label: "Knowledge Base" }]}>
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: "#1B1C20",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            color: "#fff",
            borderRadius: "12px",
          },
        }}
      />

      <div>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold text-white tracking-tight">Knowledge Base</h1>
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input 
                type="text" 
                placeholder="Search resources..." 
                className="bg-[#1B1C20] border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-white/20 w-64 transition-colors placeholder:text-white/20"
              />
            </div>
            <button className="p-2 text-white/60 hover:text-white transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-background"></span>
            </button>
          </div>
        </div>

        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ 
                duration: 0.5, 
                delay: 0.1,
                ease: [0.25, 0.46, 0.45, 0.94]
              }}
            >
              <NewProjectSlot onClick={handleCreateProject} />
            </motion.div>
            {allProjects.map((project, idx) => {
              const isRemoving = removingIds.has(String(project.id))
              return (
                <motion.div
                  key={project.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{
                    opacity: isRemoving ? 0 : 1,
                    scale: isRemoving ? 0.9 : 1,
                    y: isRemoving ? 20 : 0,
                  }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  transition={{
                    duration: 0.5,
                    delay: 0.1 + (idx + 1) * 0.08,
                    ease: [0.25, 0.46, 0.45, 0.94],
                    layout: { 
                      duration: 0.5, 
                      ease: [0.25, 0.46, 0.45, 0.94]
                    },
                  }}
                >
                  <ProjectFolder
                    project={project}
                    index={idx}
                    onRemove={() => handleRemoveFolder(String(project.id))}
                    onCancel={() => handleRemoveFolder(String(project.id))}
                    onClick={() => handleFolderClick(project.id)}
                  />
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </SidebarLayout>
  )
}
