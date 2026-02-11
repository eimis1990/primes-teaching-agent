"use client"

import { use, useEffect, useState, useRef, useCallback } from "react"
import { useProjects, type Document } from "@/contexts/project-context"
import { useRouter } from "next/navigation"
import { SidebarLayout } from "@/components/layouts/sidebar-layout"
import { PageHeader } from "@/components/dashboard/page-header"
import { Button } from "@/components/ui/button"
import { FileText, Mic, Upload, FileAudio, Play, Pause, Edit2, X, Trash2, RefreshCw, CheckCircle2, AlertCircle, Square, MoreVertical, Loader2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ToastContainer, toast } from 'react-toastify'
import { VoiceRecorder } from "@/components/voice-recorder"
import { DocumentEditor } from "@/components/document-editor"
import { motion, AnimatePresence } from "framer-motion"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/contexts/auth-context"
import { transcribeAudio } from "@/app/actions"

// Helper to play audio
const PlayButton = ({ audioUrl }: { audioUrl: string }) => {
    const [isPlaying, setIsPlaying] = useState(false)
    const [audio, setAudio] = useState<HTMLAudioElement | null>(null)

    useEffect(() => {
        const audioEl = new Audio(audioUrl)
        audioEl.onended = () => setIsPlaying(false)
        setAudio(audioEl)
        return () => {
            audioEl.pause()
        }
    }, [audioUrl])

    const toggle = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (!audio) return
        if (isPlaying) {
            audio.pause()
        } else {
            audio.play()
        }
        setIsPlaying(!isPlaying)
    }

    return (
        <button onClick={toggle} className="p-2 rounded-full bg-white/10 hover:bg-white text-white hover:text-black transition-all">
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
        </button>
    )
}

// Since params is a Promise in recent Next.js versions (or at least treated as such in some contexts), 
// but in 14/15 it might be direct. The prompt suggests a standard structure.
// However, to be safe with "use client" and dynamic routes, let's assume standard params prop.
export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const { getProject, addDocument, updateDocument, removeDocument } = useProjects()
    const { user } = useAuth()
    const supabase = createClient()
    const router = useRouter()
    const [project, setProject] = useState(getProject(id))
    const [uploading, setUploading] = useState(false)

    // Update project when it changes (e.g. docs added)
    // We can't easily subscribe to single project changes without a better context selector or effect
    // So we'll force update logic or re-fetch.
    // Actually, useProjects provides the full array, so we can derive it.
    const { projects } = useProjects()
    useEffect(() => {
        const p = getProject(id)
        if (p) setProject(p)
    }, [id, projects, getProject])

    // We simply re-fetch or rely on the context to re-render. Since we use useProjects hook at top level, changes should reflect.
    // However, simple find might return same ref if not careful.

    const [viewState, setViewState] = useState<"list" | "recording" | "viewing" | "editing">("list")
    const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
    const [embeddingStatus, setEmbeddingStatus] = useState<Record<string, { hasEmbeddings: boolean, isProcessing: boolean }>>({})
    const [isReprocessing, setIsReprocessing] = useState(false)
    // Track documents currently being transcribed
    const [processingDocs, setProcessingDocs] = useState<string[]>([])

    // Inline recording state
    const [isRecording, setIsRecording] = useState(false)
    const [recordingDuration, setRecordingDuration] = useState(0)
    const [isSaving, setIsSaving] = useState(false)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const audioChunksRef = useRef<Blob[]>([])
    const timerRef = useRef<NodeJS.Timeout | null>(null)

    const fileInputRef = useRef<HTMLInputElement>(null)

    const triggerFileUpload = () => {
        fileInputRef.current?.click()
    }

    // Process voice recording: save then transcribe
    const processVoiceRecording = async (blob: Blob) => {
        console.log('📝 [processVoiceRecording] Starting...')
        const savingToastId = toast.loading('Saving recording...')
        setIsSaving(true)
        
        try {
            if (!user) {
                console.error('❌ [processVoiceRecording] No user found')
                throw new Error('User not authenticated')
            }

            console.log('📤 [processVoiceRecording] Uploading audio to storage...')
            // Step 1: Upload audio to Supabase Storage
            const fileName = `${user.id}/${Date.now()}_voice.webm`
            
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('voice-recordings')
                .upload(fileName, blob, {
                    contentType: 'audio/webm',
                    cacheControl: '3600',
                    upsert: false
                })

            if (uploadError) {
                console.error('❌ [processVoiceRecording] Upload error:', uploadError)
                throw uploadError
            }

            console.log('✅ [processVoiceRecording] Audio uploaded successfully')

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('voice-recordings')
                .getPublicUrl(fileName)

            console.log('📄 [processVoiceRecording] Creating document...')
            // Step 2: Create document with placeholder content
            await addDocument(project.id, {
                title: `Voice Note - ${new Date().toLocaleTimeString()}`,
                type: "voice",
                audioUrl: publicUrl,
                content: "🔄 Transcribing audio..." // Placeholder
            })
            
            console.log('✅ [processVoiceRecording] Document created')
            toast.dismiss(savingToastId)
            toast.success('Recording saved!')
            setIsSaving(false)
            
            // Step 3: Get the newly created document ID
            const { data: docs, error: docsError } = await supabase
                .from('documents')
                .select('id')
                .eq('topic_id', project.id)
                .order('created_at', { ascending: false })
                .limit(1)
            
            if (docsError) {
                console.error('❌ [processVoiceRecording] Error fetching document:', docsError)
                throw docsError
            }

            if (docs && docs[0]) {
                const docId = docs[0].id
                console.log('📝 [processVoiceRecording] Document ID:', docId)
                
                // Mark document as processing
                console.log('⏳ [processVoiceRecording] Starting transcription...')
                setProcessingDocs(prev => {
                    console.log('📋 [processVoiceRecording] Current processing docs:', prev)
                    const updated = [...prev, docId]
                    console.log('📋 [processVoiceRecording] Updated processing docs:', updated)
                    return updated
                })
                
                // Step 4: Process transcription asynchronously in background
                setTimeout(async () => {
                    try {
                        console.log('🎤 [transcription] Starting transcription for doc:', docId)
                        console.log('🎤 [transcription] Blob size:', blob.size, 'type:', blob.type)
                        
                        // Convert blob to File with proper filename
                        const audioFile = new File([blob], "recording.webm", { type: "audio/webm" })
                        console.log('🎤 [transcription] File created:', audioFile.name, audioFile.size, audioFile.type)
                        
                        const formData = new FormData()
                        formData.append("file", audioFile)
                        console.log('🎤 [transcription] FormData created, calling transcribeAudio...')
                        
                        const transcription = await transcribeAudio(formData)
                        console.log('🎤 [transcription] Transcription result:', transcription)
                        
                        const text = transcription.error ? "Audio recording (transcription unavailable)" : transcription.text
                        
                        // Update document with transcription
                        console.log('💾 [transcription] Updating document with transcript...')
                        await updateDocument(project.id, docId, { content: text })
                        console.log('✅ [transcription] Document updated')
                        
                        // Process embeddings if transcription successful
                        if (!transcription.error && text) {
                            console.log('🔍 [transcription] Processing embeddings...')
                            fetch('/api/embeddings/process', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ documentId: docId })
                            }).catch(err => console.error('❌ [transcription] Error processing embeddings:', err))
                        }
                        
                        // Remove from processing state
                        console.log('🏁 [transcription] Removing from processing state')
                        setProcessingDocs(prev => {
                            const updated = prev.filter(id => id !== docId)
                            console.log('📋 [transcription] Updated processing docs:', updated)
                            return updated
                        })
                        
                        toast.success("Voice note transcribed!")
                    } catch (error) {
                        console.error('❌ [transcription] Error:', error)
                        await updateDocument(project.id, docId, { 
                            content: "Audio recording (transcription failed)" 
                        })
                        setProcessingDocs(prev => prev.filter(id => id !== docId))
                        toast.error("Transcription failed")
                    }
                }, 100) // Small delay to ensure state updates
            }
        } catch (error) {
            console.error('❌ [processVoiceRecording] Error:', error)
            toast.dismiss(savingToastId)
            setIsSaving(false)
            toast.error("Failed to save recording")
        }
    }

    // Helper functions - MUST be before any early returns
    const checkEmbeddingStatus = async (documentId: string) => {
        try {
            const { data, error } = await supabase
                .from('document_embeddings')
                .select('id')
                .eq('document_id', documentId)
                .limit(1)
            
            if (error) {
                console.error('Error checking embedding status:', error)
                return false
            }
            
            return (data && data.length > 0)
        } catch (error) {
            console.error('Error checking embedding status:', error)
            return false
        }
    }

    const reprocessEmbeddings = async (documentId: string) => {
        setIsReprocessing(true)
        setEmbeddingStatus(prev => ({
            ...prev,
            [documentId]: { hasEmbeddings: false, isProcessing: true }
        }))
        
        const toastId = toast.loading('Re-processing document...')
        
        try {
            toast.update(toastId, { 
                render: 'Chunking text...', 
                isLoading: true 
            })
            
            const response = await fetch('/api/embeddings/process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentId })
            })
            
            const result = await response.json()
            
            if (result.success) {
                setEmbeddingStatus(prev => ({
                    ...prev,
                    [documentId]: { hasEmbeddings: true, isProcessing: false }
                }))
                
                toast.update(toastId, {
                    render: `Successfully processed ${result.chunkCount} chunks! Document is now searchable.`,
                    type: 'success',
                    isLoading: false,
                    autoClose: 5000
                })
            } else {
                setEmbeddingStatus(prev => ({
                    ...prev,
                    [documentId]: { hasEmbeddings: false, isProcessing: false }
                }))
                
                toast.update(toastId, {
                    render: `Failed to process embeddings: ${result.error}`,
                    type: 'error',
                    isLoading: false,
                    autoClose: 5000
                })
            }
        } catch (error) {
            console.error('Error reprocessing embeddings:', error)
            setEmbeddingStatus(prev => ({
                ...prev,
                [documentId]: { hasEmbeddings: false, isProcessing: false }
            }))
            
            toast.update(toastId, {
                render: `Failed to process embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`,
                type: 'error',
                isLoading: false,
                autoClose: 5000
            })
        } finally {
            setIsReprocessing(false)
        }
    }

    // Check embedding status for all documents - MUST be before any early returns
    useEffect(() => {
        if (!project) return
        
        const checkAllStatuses = async () => {
            const statusMap: Record<string, { hasEmbeddings: boolean, isProcessing: boolean }> = {}
            
            for (const doc of project.documents) {
                const hasEmbeddings = await checkEmbeddingStatus(doc.id)
                statusMap[doc.id] = { hasEmbeddings, isProcessing: false }
            }
            
            setEmbeddingStatus(statusMap)
        }
        
        checkAllStatuses()
    }, [project?.documents.length])

    const handleViewDocument = (doc: Document) => {
        setSelectedDoc(doc)
        setViewState("viewing")
    }

    const handleEditDocument = () => {
        if (selectedDoc) {
            setViewState("editing")
        }
    }

    const handleSaveDocument = async (content: string) => {
        if (selectedDoc) {
            const toastId = toast.loading('Saving changes...')
            
            try {
                // UPDATE LOGIC:
                // To persist edits, we must call updateDocument with the CORRECT ID.
                // For voice documents, update the title to reflect it's been edited
                const updates: Partial<Document> = { content }
                
                if (selectedDoc.type === "voice" && content !== selectedDoc.content) {
                    // Update title to indicate transcript has been edited
                    updates.title = selectedDoc.title.includes('(Edited)') 
                        ? selectedDoc.title 
                        : `${selectedDoc.title} (Edited)`
                }
                
                await updateDocument(project.id, selectedDoc.id, updates)

                // Update local view state to reflect change immediately
                setSelectedDoc({ ...selectedDoc, ...updates })
                
                toast.update(toastId, {
                    render: 'Document saved!',
                    type: 'success',
                    isLoading: false,
                    autoClose: 2000
                })
                
                // Automatically regenerate embeddings if content changed
                if (content !== selectedDoc.content && content.trim()) {
                    const embedToastId = toast.loading('Regenerating embeddings...')
                    
                    try {
                        // Delete old embeddings and create new ones
                        const response = await fetch('/api/embeddings/process', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ documentId: selectedDoc.id })
                        })
                        
                        const result = await response.json()
                        
                        if (result.success) {
                            console.log(`✅ Embeddings regenerated: ${result.chunkCount} chunks`)
                            
                            // Update embedding status
                            setEmbeddingStatus(prev => ({
                                ...prev,
                                [selectedDoc.id]: { hasEmbeddings: true, isProcessing: false }
                            }))
                            
                            toast.update(embedToastId, {
                                render: `Embeddings updated! ${result.chunkCount} chunks ready for chat.`,
                                type: 'success',
                                isLoading: false,
                                autoClose: 4000
                            })
                        } else {
                            console.error('Error regenerating embeddings:', result.error)
                            toast.update(embedToastId, {
                                render: `Saved but embeddings failed. Click Re-process to retry.`,
                                type: 'warning',
                                isLoading: false,
                                autoClose: 6000
                            })
                        }
                    } catch (embedError) {
                        console.error('Error regenerating embeddings:', embedError)
                        toast.update(embedToastId, {
                            render: 'Saved but embeddings failed. Click Re-process to retry.',
                            type: 'warning',
                            isLoading: false,
                            autoClose: 6000
                        })
                    }
                }
            } catch (error) {
                console.error('Error saving document:', error)
                toast.update(toastId, {
                    render: 'Failed to save document',
                    type: 'error',
                    isLoading: false,
                    autoClose: 5000
                })
            }
        }
        setViewState("viewing") // Go back to view mode after save
    }

    const handleDeleteDocument = async (docId: string) => {
        if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
            return
        }

        try {
            await removeDocument(project.id, docId)
            setViewState("list")
            setSelectedDoc(null)
        } catch (error) {
            console.error('Error deleting document:', error)
            alert('Failed to delete document. Please try again.')
        }
    }


    if (!project) {
        return (
            <SidebarLayout breadcrumbs={[{ label: "Knowledge Base", href: "/knowledge-base" }]}>
                <div className="flex items-center justify-center min-h-[50vh]">
                    <div className="text-center">
                        <h2 className="text-xl mb-4 text-white/60">Project not found</h2>
                        <Button onClick={() => router.push("/knowledge-base")}>
                            Go to Knowledge Base
                        </Button>
                    </div>
                </div>
            </SidebarLayout>
        )
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !user) return

        setUploading(true)

        try {
            const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
            const isTextFile = file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')
            
            if (isPDF) {
                // For PDFs, extract text content with loading toasts
                const toastId = toast.loading('Uploading PDF...')
                
                try {
                    // Step 1: Upload PDF to storage first
                    const filePath = `${user.id}/${project.id}/${Date.now()}-${file.name}`
                    const { data: uploadData, error: uploadError } = await supabase.storage
                        .from('documents')
                        .upload(filePath, file, {
                            cacheControl: '3600',
                            upsert: false
                        })
                    
                    if (uploadError) throw uploadError
                    
                    // Get public URL for the uploaded PDF
                    const { data: { publicUrl } } = supabase.storage
                        .from('documents')
                        .getPublicUrl(uploadData.path)
                    
                    // Step 2: Extract text via server-side API
                    toast.update(toastId, { 
                        render: 'Extracting text from PDF...', 
                        isLoading: true 
                    })
                    
                    // Send PDF to server for text extraction
                    const formData = new FormData()
                    formData.append('file', file)
                    
                    const extractResponse = await fetch('/api/pdf/extract', {
                        method: 'POST',
                        body: formData
                    })
                    
                    const extractResult = await extractResponse.json()
                    
                    if (!extractResult.success || !extractResult.text || extractResult.text.trim() === '') {
                        toast.update(toastId, {
                            render: `${extractResult.error || 'Could not extract text from PDF. The PDF might be image-based or encrypted.'}`,
                            type: 'error',
                            isLoading: false,
                            autoClose: 5000
                        })
                        setUploading(false)
                        return
                    }
                    
                    console.log('📄 PDF Extraction Results:')
                    console.log(`  - Pages: ${extractResult.numPages}`)
                    console.log(`  - Text length: ${extractResult.text.length} characters`)
                    console.log(`  - First 200 chars: "${extractResult.text.substring(0, 200)}..."`)
                    
                    // Step 3: Save document with PDF URL
                    toast.update(toastId, { 
                        render: 'Saving document...', 
                        isLoading: true 
                    })
                    
                    await addDocument(project.id, {
                        title: file.name,
                        type: "text",
                        content: extractResult.text,
                        audioUrl: publicUrl // Now PDFs can be previewed!
                    })
                    
                    // Step 3: Generate embeddings
                    toast.update(toastId, { 
                        render: 'Generating embeddings...', 
                        isLoading: true 
                    })
                    
                    const { data: docs } = await supabase
                        .from('documents')
                        .select('id')
                        .eq('topic_id', project.id)
                        .order('created_at', { ascending: false })
                        .limit(1)
                    
                    if (docs && docs[0]) {
                        // Process embeddings and wait for result
                        const response = await fetch('/api/embeddings/process', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ documentId: docs[0].id })
                        })
                        
                        const result = await response.json()
                        
                        if (result.success) {
                            console.log(`✅ Embeddings processed: ${result.chunkCount} chunks`)
                            
                            // Success! Update embedding status
                            setEmbeddingStatus(prev => ({
                                ...prev,
                                [docs[0].id]: { hasEmbeddings: true, isProcessing: false }
                            }))
                            
                            toast.update(toastId, {
                                render: `PDF uploaded! ${result.chunkCount} chunks created and ready to search.`,
                                type: 'success',
                                isLoading: false,
                                autoClose: 5000
                            })
                        } else {
                            console.error('Error processing embeddings:', result.error)
                            toast.update(toastId, {
                                render: `PDF uploaded but embeddings failed: ${result.error}`,
                                type: 'warning',
                                isLoading: false,
                                autoClose: 5000
                            })
                        }
                    }
                    
                    setUploading(false)
                } catch (error) {
                    console.error('Error processing PDF:', error)
                    toast.update(toastId, {
                        render: `Failed to process PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
                        type: 'error',
                        isLoading: false,
                        autoClose: 5000
                    })
                    setUploading(false)
                }
            } else if (isTextFile) {
                // For text files, read and store content directly
                const toastId = toast.loading('Uploading text file...')
                
                const reader = new FileReader()
                
                reader.onload = async (event) => {
                    try {
                        const content = event.target?.result as string
                        
                        toast.update(toastId, { 
                            render: 'Saving document...', 
                            isLoading: true 
                        })
                        
                        await addDocument(project.id, {
                            title: file.name,
                            type: "text",
                            content: content,
                            audioUrl: undefined
                        })
                        
                        // Process embeddings
                        toast.update(toastId, { 
                            render: 'Generating embeddings...', 
                            isLoading: true 
                        })
                        
                        const { data: docs } = await supabase
                            .from('documents')
                            .select('id')
                            .eq('topic_id', project.id)
                            .order('created_at', { ascending: false })
                            .limit(1)
                        
                        if (docs && docs[0]) {
                            const response = await fetch('/api/embeddings/process', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ documentId: docs[0].id })
                            })
                            
                            const result = await response.json()
                            
                            if (result.success) {
                                console.log(`✅ Embeddings processed: ${result.chunkCount} chunks`)
                                
                                setEmbeddingStatus(prev => ({
                                    ...prev,
                                    [docs[0].id]: { hasEmbeddings: true, isProcessing: false }
                                }))
                                
                                toast.update(toastId, {
                                    render: `File uploaded! ${result.chunkCount} chunks created and ready to search.`,
                                    type: 'success',
                                    isLoading: false,
                                    autoClose: 5000
                                })
                            } else {
                                console.error('Error processing embeddings:', result.error)
                                toast.update(toastId, {
                                    render: `File uploaded but embeddings failed: ${result.error}`,
                                    type: 'warning',
                                    isLoading: false,
                                    autoClose: 5000
                                })
                            }
                        }
                        
                        setUploading(false)
                    } catch (error) {
                        console.error('Error processing text file:', error)
                        toast.update(toastId, {
                            render: `Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`,
                            type: 'error',
                            isLoading: false,
                            autoClose: 5000
                        })
                        setUploading(false)
                    }
                }
                
                reader.onerror = () => {
                    console.error('Error reading file')
                    toast.error('Failed to read file. Please try again.')
                    setUploading(false)
                }
                
                reader.readAsText(file)
            } else {
                // For other files (images, etc.), upload to Supabase Storage
                const fileExt = file.name.split('.').pop()
                const fileName = `${user.id}/${Date.now()}_${file.name}`
                
                // Upload to storage
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('voice-recordings') // Using same bucket for all files
                    .upload(fileName, file, {
                        cacheControl: '3600',
                        upsert: false
                    })

                if (uploadError) {
                    console.error('Upload error:', uploadError)
                    throw uploadError
                }

                // Get public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('voice-recordings')
                    .getPublicUrl(fileName)

                // Save document metadata with storage URL
                await addDocument(project.id, {
                    title: file.name,
                    type: "text",
                    content: `File stored in Supabase Storage.\n\nFile: ${file.name}\nType: ${file.type || 'Unknown'}\nSize: ${(file.size / 1024).toFixed(2)} KB`,
                    audioUrl: publicUrl // Store the file URL in audioUrl field
                })
                
                setUploading(false)
            }
        } catch (error) {
            console.error('Error uploading file:', error)
            alert('Failed to upload file. Please try again.')
            setUploading(false)
        }
    }

    const handleVoiceSave = async (blob: Blob, duration: number, transcript?: string) => {
        if (!user) return
        
        setUploading(true)
        
        try {
            // Upload audio to Supabase Storage
            const fileName = `${user.id}/${Date.now()}_voice.webm`
            
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('voice-recordings')
                .upload(fileName, blob, {
                    contentType: 'audio/webm',
                    cacheControl: '3600',
                    upsert: false
                })

            if (uploadError) {
                console.error('Upload error:', uploadError)
                throw uploadError
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('voice-recordings')
                .getPublicUrl(fileName)

            // Save document with storage URL
            await addDocument(project.id, {
                title: `Voice Note - ${new Date().toLocaleTimeString()}`,
                type: "voice",
                audioUrl: publicUrl,
                content: transcript || "Audio recording saved. Click 'Edit Transcript' to add transcription."
            })
            
            // Process embeddings in the background
            // Get the newly created document ID
            const { data: docs } = await supabase
                .from('documents')
                .select('id')
                .eq('topic_id', project.id)
                .order('created_at', { ascending: false })
                .limit(1)
            
            if (docs && docs[0] && transcript) {
                // Process embeddings asynchronously
                fetch('/api/embeddings/process', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ documentId: docs[0].id })
                }).catch(err => console.error('Error processing embeddings:', err))
            }
            
            setUploading(false)
            // setViewState("list") // No longer needed as we are inline
        } catch (error) {
            console.error('Error saving voice recording:', error)
            alert('Failed to save voice recording. Please try again.')
            setUploading(false)
        }
    }

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const mediaRecorder = new MediaRecorder(stream)
            mediaRecorderRef.current = mediaRecorder
            audioChunksRef.current = []

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data)
                }
            }

            mediaRecorder.onstop = () => {
                console.log('🛑 [Recording] Stopped')
                const blob = new Blob(audioChunksRef.current, { type: "audio/webm" })
                
                // Stop tracks
                stream.getTracks().forEach(track => track.stop())
                
                // Reset recording state immediately
                setIsRecording(false)
                setRecordingDuration(0)
                
                // Process the recording (save then transcribe)
                processVoiceRecording(blob)
            }

            mediaRecorder.start()
            setIsRecording(true)
            
            const startTime = Date.now()
            timerRef.current = setInterval(() => {
                setRecordingDuration(Math.floor((Date.now() - startTime) / 1000))
            }, 1000)

        } catch (error) {
            console.error("Error accessing microphone:", error)
            toast.error("Could not access microphone")
        }
    }

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop()
            if (timerRef.current) {
                clearInterval(timerRef.current)
                timerRef.current = null
            }
        }
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, "0")}`
    }

    // Effect to handle saving via context update (placeholder logic)
    // I need to update the context to support updating documents.
    // For now, I'll allow simple viewing/closing of editor.

    return (
        <SidebarLayout breadcrumbs={[
            { label: "Knowledge Base", href: "/knowledge-base" },
            { label: project.title }
        ]}>
            <ToastContainer
                position="bottom-right"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="dark"
                style={{ 
                    width: 'auto',
                    minWidth: '400px',
                    maxWidth: '600px'
                }}
                toastStyle={{
                    backgroundColor: '#1B1C20',
                    color: '#fff',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    minHeight: '60px',
                    fontSize: '15px',
                    padding: '16px',
                    whiteSpace: 'nowrap',
                    width: 'fit-content'
                }}
            />
            
            <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                onChange={handleFileUpload} 
                accept=".pdf,.txt,.doc,.docx,.md,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown" 
                disabled={uploading} 
            />

            <PageHeader
                title={project.title}
                description="Manage and view your documents"
                className="mb-3 md:mb-4"
            />

            <div className="pt-0">
                <AnimatePresence mode="wait">
                    {viewState === "editing" && selectedDoc ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-8"
                        >
                            <DocumentEditor
                                title={selectedDoc.title}
                                initialContent={selectedDoc.content || ""}
                                onSave={handleSaveDocument}
                                onClose={() => setViewState("viewing")}
                            />
                        </motion.div>
                    ) : viewState === "viewing" && selectedDoc ? (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => {
                                    setViewState("list")
                                    setSelectedDoc(null)
                                }}
                                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                            />
                            <motion.div
                                initial={{ x: "100%" }}
                                animate={{ x: 0 }}
                                exit={{ x: "100%" }}
                                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                                className="fixed inset-y-0 right-0 z-50 w-full md:w-1/2 bg-gradient-to-b from-[#1D1E24] to-[#17181E] border-l border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.45)] flex flex-col"
                            >
                                {/* Viewer Header */}
                                <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#1B1C20]/90 backdrop-blur-xl">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <h3 className="font-semibold text-white truncate max-w-[260px] md:max-w-[360px]">{selectedDoc.title}</h3>
                                        {embeddingStatus[selectedDoc.id] && (() => {
                                            const status = embeddingStatus[selectedDoc.id]

                                            if (status.isProcessing) {
                                                return (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-yellow-400/20 bg-yellow-400/10 px-2.5 py-1 text-xs text-yellow-300">
                                                        <RefreshCw size={12} className="animate-spin" />
                                                        Processing
                                                    </span>
                                                )
                                            }

                                            if (status.hasEmbeddings) {
                                                return (
                                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-green-400/20 bg-green-400/10 px-2.5 py-1 text-xs text-green-300">
                                                        <CheckCircle2 size={12} />
                                                        Searchable
                                                    </span>
                                                )
                                            }

                                            return (
                                                <span className="inline-flex items-center gap-1.5 rounded-full border border-red-400/20 bg-red-400/10 px-2.5 py-1 text-xs text-red-300">
                                                    <AlertCircle size={12} />
                                                    Not indexed
                                                </span>
                                            )
                                        })()}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button className="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors focus:outline-none border border-transparent hover:border-white/10">
                                                    <MoreVertical size={20} />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48 bg-[#1B1C20] border-white/10 text-white">
                                                {selectedDoc.content && (
                                                    <DropdownMenuItem
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            reprocessEmbeddings(selectedDoc.id)
                                                        }}
                                                        disabled={isReprocessing || embeddingStatus[selectedDoc.id]?.isProcessing}
                                                        className="flex items-center gap-2 cursor-pointer focus:bg-white/10 focus:text-white"
                                                    >
                                                        <RefreshCw size={14} className={isReprocessing || embeddingStatus[selectedDoc.id]?.isProcessing ? 'animate-spin' : ''} />
                                                        <span>{isReprocessing || embeddingStatus[selectedDoc.id]?.isProcessing ? 'Processing...' : 'Re-process'}</span>
                                                    </DropdownMenuItem>
                                                )}
                                                {selectedDoc.type === "voice" && (
                                                    <DropdownMenuItem
                                                        onClick={handleEditDocument}
                                                        className="flex items-center gap-2 cursor-pointer focus:bg-white/10 focus:text-white"
                                                    >
                                                        <Edit2 size={14} />
                                                        <span>Edit</span>
                                                    </DropdownMenuItem>
                                                )}
                                                <DropdownMenuItem
                                                    onClick={() => handleDeleteDocument(selectedDoc.id)}
                                                    className="flex items-center gap-2 cursor-pointer text-red-400 focus:bg-red-500/10 focus:text-red-400"
                                                >
                                                    <Trash2 size={14} />
                                                    <span>Delete</span>
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                        
                                        <div className="w-[1px] h-6 bg-white/10 mx-1" />

                                        <button
                                            onClick={() => {
                                                setViewState("list")
                                                setSelectedDoc(null)
                                            }}
                                            className="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors border border-transparent hover:border-white/10"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>
                                </div>

                                {/* Viewer Content */}
                                <div className="flex-1 overflow-y-auto relative bg-gradient-to-b from-[#181920] to-[#14151B]">
                                    {selectedDoc.type === "voice" && selectedDoc.audioUrl && (
                                        <div className="mx-6 mt-6 p-5 rounded-xl border border-white/10 bg-[#111217]/80">
                                            <h4 className="text-xs font-mono text-white/50 mb-4 uppercase tracking-[0.2em]">Audio Recording</h4>
                                            <audio controls src={selectedDoc.audioUrl} className="w-full" />
                                        </div>
                                    )}

                                    <div className="p-6 md:p-8 h-full">
                                        {/* Display document content */}
                                        {/* Check if this is a stored file (has audioUrl and is NOT a voice document) */}
                                        {selectedDoc.type === "text" && selectedDoc.audioUrl ? (
                                            /* Display stored file (PDF, Word, image, etc.) */
                                            selectedDoc.title.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                                /* Image preview */
                                                <div className="flex items-center justify-center h-full rounded-xl border border-white/10 bg-[#111217]/80 p-4">
                                                    <img 
                                                        src={selectedDoc.audioUrl} 
                                                        alt={selectedDoc.title}
                                                        className="max-w-full max-h-full object-contain rounded-lg"
                                                    />
                                                </div>
                                            ) : selectedDoc.title.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/i) ? (
                                                /* Document preview using Google Docs Viewer */
                                                <div className="h-full flex flex-col rounded-xl border border-white/10 bg-[#111217]/80 p-3">
                                                    <iframe 
                                                        src={`https://docs.google.com/gview?url=${encodeURIComponent(selectedDoc.audioUrl)}&embedded=true`}
                                                        className="w-full flex-1 rounded-lg border border-white/10 min-h-[420px]" 
                                                        title={selectedDoc.title}
                                                    />
                                                    <div className="mt-4 flex justify-center">
                                                        <a 
                                                            href={selectedDoc.audioUrl} 
                                                            download={selectedDoc.title}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors flex items-center gap-2 border border-white/10"
                                                        >
                                                            <Upload size={16} className="rotate-180" /> Download Original
                                                        </a>
                                                    </div>
                                                </div>
                                            ) : (
                                                /* Unsupported file type */
                                                <div className="flex flex-col items-center justify-center h-full text-center rounded-xl border border-white/10 bg-[#111217]/80 p-8">
                                                    <FileText size={64} className="text-white/20 mb-4" />
                                                    <p className="text-white/60 mb-4">Preview not available for this file type.</p>
                                                    <a 
                                                        href={selectedDoc.audioUrl} 
                                                        download={selectedDoc.title}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="px-6 py-3 bg-white text-black rounded-full font-medium hover:bg-gray-200 transition-colors"
                                                    >
                                                        Download File
                                                    </a>
                                                </div>
                                            )
                                        ) : selectedDoc.content ? (
                                            /* Display text content (for text files without storage URL) */
                                            <div className="prose prose-invert max-w-none rounded-xl border border-white/10 bg-[#111217]/80 p-6">
                                                {selectedDoc.content.split('\n').map((line, i) => (
                                                    <p key={i} className="mb-2 text-white/80 leading-relaxed text-base">
                                                        {line || '\u00A0'} {/* Non-breaking space for empty lines */}
                                                    </p>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-center rounded-xl border border-white/10 bg-[#111217]/80 p-8">
                                                <FileText size={64} className="text-white/20 mb-4" />
                                                <p className="text-white/60">No content available for this document.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        </>

                    ) : viewState === "recording" ? (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="flex flex-col items-center justify-center min-h-[400px]"
                        >
                            <VoiceRecorder
                                onSave={handleVoiceSave}
                                onCancel={() => setViewState("list")}
                            />
                        </motion.div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="pt-1 md:pt-2"
                        >
                            <div className="space-y-8">
                                <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#1B1C20] via-[#17181B] to-[#131417] p-5 md:p-6">
                                    <div className="flex flex-col gap-1 mb-5">
                                        <h2 className="text-base md:text-lg font-semibold text-white">Create New Document</h2>
                                        <p className="text-sm text-white/50">Start with a voice note or upload an existing file.</p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                                        <motion.div
                                            layout
                                            className={`relative p-5 rounded-xl bg-[#F34A23] hover:bg-[#d63d1d] transition-all group cursor-pointer hover:shadow-xl hover:-translate-y-1 flex flex-col items-center justify-center min-h-[148px] gap-2 ${isRecording ? 'ring-4 ring-orange-500/30' : ''}`}
                                            onClick={!isRecording ? startRecording : undefined}
                                        >
                                            {isRecording ? (
                                                <>
                                                    <div className="flex flex-col items-center gap-2">
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                                            <span className="text-white font-mono font-medium text-sm">{formatTime(recordingDuration)}</span>
                                                        </div>
                                                        <span className="text-white/80 text-[10px]">Recording...</span>
                                                    </div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            stopRecording()
                                                        }}
                                                        className="p-2 rounded-full bg-white text-[#F34A23] hover:scale-110 transition-transform shadow-lg"
                                                    >
                                                        <Square size={14} fill="currentColor" />
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="p-3 rounded-full bg-white/20 text-white group-hover:scale-110 transition-transform">
                                                        <Mic size={24} />
                                                    </div>
                                                    <h4 className="font-medium text-sm text-white text-center">Record Voice</h4>
                                                </>
                                            )}
                                        </motion.div>

                                        <motion.div
                                            layout
                                            className="relative p-5 rounded-xl bg-transparent border-2 border-dashed border-white/20 hover:border-white/40 hover:bg-[#1B1C20]/50 transition-all group cursor-pointer hover:shadow-xl hover:-translate-y-1 flex flex-col items-center justify-center min-h-[148px] gap-2"
                                            onClick={triggerFileUpload}
                                        >
                                            <div className="p-3 rounded-full bg-white/5 text-white group-hover:scale-110 group-hover:bg-white/10 transition-all">
                                                <Upload size={24} />
                                            </div>
                                            <h4 className="font-medium text-sm text-white text-center">Add New File</h4>
                                        </motion.div>
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-semibold uppercase tracking-wide text-white/70">Knowledge Documents</h3>
                                        <span className="text-xs text-white/40">{project.documents.length} total</span>
                                    </div>

                                    {project.documents.length === 0 ? (
                                        <div className="rounded-2xl border border-white/10 bg-[#1B1C20]/70 p-10 text-center">
                                            <p className="text-white/50 mb-1">No documents yet.</p>
                                            <p className="text-sm text-white/35">Use the actions above to create your first document.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                            {project.documents.map((doc) => {
                                                const isProcessing = processingDocs.includes(doc.id)
                                                return (
                                                    <motion.div
                                                        layout
                                                        key={doc.id}
                                                        onClick={() => !isProcessing && handleViewDocument(doc)}
                                                        className={`relative p-4 rounded-xl bg-[#1B1C20] border border-white/5 hover:border-white/10 transition-all group aspect-square flex flex-col justify-between ${
                                                            isProcessing
                                                                ? 'cursor-not-allowed'
                                                                : 'cursor-pointer hover:shadow-xl hover:-translate-y-1'
                                                        }`}
                                                    >
                                                        <div className="flex items-start justify-between">
                                                            <div className="text-[#F34A23]">
                                                                {doc.type === "voice" ? <Mic size={20} /> : <FileText size={20} />}
                                                            </div>
                                                            {doc.type === "voice" && doc.audioUrl && !isProcessing && (
                                                                <PlayButton audioUrl={doc.audioUrl} />
                                                            )}
                                                        </div>

                                                        <div>
                                                            <h4 className="font-medium text-sm text-white mb-1.5 line-clamp-2 leading-tight" title={doc.title}>{doc.title}</h4>
                                                            <div className="flex items-center gap-1.5 text-[10px] text-white/40">
                                                                <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                                                                <span>•</span>
                                                                <span className="uppercase">{doc.type}</span>
                                                            </div>
                                                        </div>

                                                        {isProcessing && (
                                                            <div className="absolute inset-0 flex items-center justify-center bg-[#1B1C20]/95 rounded-xl backdrop-blur-sm">
                                                                <div className="text-center">
                                                                    <Loader2 size={32} className="text-[#F34A23] animate-spin mx-auto mb-3" />
                                                                    <p className="text-sm font-medium text-white">Transcribing...</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </motion.div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </section>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </SidebarLayout>
    )
}
