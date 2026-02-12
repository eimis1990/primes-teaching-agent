"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { type Project } from "@/lib/data"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "./auth-context"

export interface Document {
  id: string
  title: string
  type: "text" | "voice"
  content?: string
  audioUrl?: string
  createdAt: string
}

export interface ExtendedProject extends Project {
  documents: Document[]
}

interface ProjectContextType {
  projects: ExtendedProject[]
  loading: boolean
  addProject: (name: string) => Promise<void>
  removeProject: (id: string) => Promise<void>
  addDocument: (projectId: string, doc: Omit<Document, "id" | "createdAt">) => Promise<void>
  updateDocument: (projectId: string, docId: string, updates: Partial<Document>) => Promise<void>
  removeDocument: (projectId: string, docId: string) => Promise<void>
  getProject: (id: string) => ExtendedProject | undefined
  refreshProjects: () => Promise<void>
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined)

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<ExtendedProject[]>([])
  const [loading, setLoading] = useState(true)
  const { user, profile } = useAuth()
  const supabase = createClient()

  // Load projects from Supabase
  const loadProjects = useCallback(async () => {
    if (!user) {
      setProjects([])
      setLoading(false)
      return
    }

    // Don't load projects if user has no organization (e.g., platform owner)
    if (!profile?.org_id) {
      setProjects([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      
      // Fetch topics with documents
      const { data: topics, error: topicsError } = await supabase
        .from('topics')
        .select(`
          id,
          title,
          description,
          created_at,
          documents:documents(
            id,
            title,
            type,
            content,
            audio_url,
            created_at
          )
        `)
        .order('created_at', { ascending: false })

      if (topicsError) {
        console.error('Error fetching topics:', topicsError)
        throw topicsError
      }

      // Transform to ExtendedProject format
      const transformedProjects: ExtendedProject[] = (topics || []).map(topic => ({
        id: topic.id,
        title: topic.title,
        clipCount: topic.documents?.length || 0,
        images: [
          "/gen-1.png",
          "/gen-2.png",
          "/gen-3.png",
          "/gen-1.png",
          "/gen-2.png"
        ].sort(() => 0.5 - Math.random()),
        createdAt: topic.created_at,
        documents: (topic.documents || []).map(doc => ({
          id: doc.id,
          title: doc.title,
          type: doc.type as "text" | "voice",
          content: doc.content || undefined,
          audioUrl: doc.audio_url || undefined,
          createdAt: doc.created_at
        }))
      }))

      setProjects(transformedProjects)
    } catch (error) {
      console.error('Error loading projects:', error)
    } finally {
      setLoading(false)
    }
  }, [user, profile, supabase])

  // Load projects when user changes
  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  const addProject = useCallback(async (name: string) => {
    if (!user) return
    if (!profile?.org_id) {
      throw new Error('Cannot create topic without organization context')
    }

    try {
      // Insert topic into Supabase
      const { data, error } = await supabase
        .from('topics')
        .insert({
          user_id: user.id,
          org_id: profile.org_id,
          title: name,
          description: null
        })
        .select()
        .single()

      if (error) throw error

      // Add to local state immediately
      const newProject: ExtendedProject = {
        id: data.id,
        title: data.title,
        clipCount: 0,
        images: [
          "/gen-1.png",
          "/gen-2.png",
          "/gen-3.png",
          "/gen-1.png",
          "/gen-2.png"
        ].sort(() => 0.5 - Math.random()),
        createdAt: data.created_at,
        documents: []
      }

      setProjects(prev => [newProject, ...prev])
    } catch (error) {
      console.error('Error adding project:', error)
    }
  }, [user, profile, supabase])

  const removeProject = useCallback(async (id: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('topics')
        .delete()
        .eq('id', id)

      if (error) throw error

      setProjects(prev => prev.filter(p => p.id !== id))
    } catch (error) {
      console.error('Error removing project:', error)
    }
  }, [user, supabase])

  const addDocument = useCallback(async (projectId: string, doc: Omit<Document, "id" | "createdAt">) => {
    if (!user) {
      console.error('Cannot add document: No user logged in')
      return
    }
    if (!profile?.org_id) {
      throw new Error('Cannot add document without organization context')
    }

    try {
      const { data, error } = await supabase
        .from('documents')
        .insert({
          topic_id: projectId,
          org_id: profile.org_id,
          user_id: user.id,
          title: doc.title,
          type: doc.type,
          content: doc.content || null,
          audio_url: doc.audioUrl || null
        })
        .select()
        .single()

      if (error) {
        console.error('Supabase error adding document:', error)
        throw error
      }

      // Update local state
      const newDoc: Document = {
        id: data.id,
        title: data.title,
        type: data.type,
        content: data.content || undefined,
        audioUrl: data.audio_url || undefined,
        createdAt: data.created_at
      }

      setProjects(prev => prev.map(p => {
        if (p.id === projectId) {
          return {
            ...p,
            documents: [...p.documents, newDoc],
            clipCount: p.clipCount + 1
          }
        }
        return p
      }))
    } catch (error) {
      console.error('Error adding document:', error)
      // Re-throw so the calling function knows it failed
      throw error
    }
  }, [user, profile, supabase])

  const updateDocument = useCallback(async (projectId: string, docId: string, updates: Partial<Document>) => {
    if (!user) return

    try {
      // Construct update object dynamically to avoid overwriting with nulls
      const updatePayload: any = {}
      if (updates.title !== undefined) updatePayload.title = updates.title
      if (updates.content !== undefined) updatePayload.content = updates.content
      if (updates.audioUrl !== undefined) updatePayload.audio_url = updates.audioUrl

      const { error } = await supabase
        .from('documents')
        .update(updatePayload)
        .eq('id', docId)

      if (error) throw error

      // Update local state
      setProjects(prev => prev.map(p => {
        if (p.id === projectId) {
          return {
            ...p,
            documents: p.documents.map(d => d.id === docId ? { ...d, ...updates } : d)
          }
        }
        return p
      }))
    } catch (error) {
      console.error('Error updating document:', error)
    }
  }, [user, supabase])

  const removeDocument = useCallback(async (projectId: string, docId: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', docId)

      if (error) throw error

      // Update local state
      setProjects(prev => prev.map(p => {
        if (p.id === projectId) {
          return {
            ...p,
            documents: p.documents.filter(d => d.id !== docId),
            clipCount: Math.max(0, p.clipCount - 1)
          }
        }
        return p
      }))
    } catch (error) {
      console.error('Error removing document:', error)
    }
  }, [user, supabase])

  const getProject = useCallback((id: string) => {
    return projects.find(p => p.id === id)
  }, [projects])

  const refreshProjects = useCallback(async () => {
    await loadProjects()
  }, [loadProjects])

  return (
    <ProjectContext.Provider value={{ 
      projects, 
      loading,
      addProject, 
      removeProject, 
      addDocument, 
      updateDocument, 
      removeDocument, 
      getProject,
      refreshProjects
    }}>
      {children}
    </ProjectContext.Provider>
  )
}

export function useProjects() {
  const context = useContext(ProjectContext)
  if (context === undefined) {
    throw new Error("useProjects must be used within a ProjectProvider")
  }
  return context
}
