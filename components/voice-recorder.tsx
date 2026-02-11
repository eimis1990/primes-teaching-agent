"use client"

import { useState, useRef, useEffect } from "react"
import { Mic, Square, Play, Pause, Trash2, Save } from "lucide-react"
import { transcribeAudio } from "@/app/actions"

interface VoiceRecorderProps {
    onSave: (audioBlob: Blob, duration: number, transcript?: string) => void
    onCancel: () => void
}

export function VoiceRecorder({ onSave, onCancel }: VoiceRecorderProps) {
    const [isRecording, setIsRecording] = useState(false)
    const [isPlaying, setIsPlaying] = useState(false)
    const [audioUrl, setAudioUrl] = useState<string | null>(null)
    const [recordingDuration, setRecordingDuration] = useState(0)
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null)

    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const audioChunksRef = useRef<Blob[]>([])
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const timerRef = useRef<NodeJS.Timeout | null>(null)
    const recognitionRef = useRef<any>(null)
    const [transcript, setTranscript] = useState("")
    const [isTranscribing, setIsTranscribing] = useState(false)

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
                const blob = new Blob(audioChunksRef.current, { type: "audio/webm" })
                setAudioBlob(blob)
                const url = URL.createObjectURL(blob)
                setAudioUrl(url)
                stream.getTracks().forEach(track => track.stop())
            }

            mediaRecorder.start()
            setIsRecording(true)
            setTranscript("")

            const startTime = Date.now()
            timerRef.current = setInterval(() => {
                setRecordingDuration(Math.floor((Date.now() - startTime) / 1000))
            }, 1000)

        } catch (error) {
            console.error("Error accessing microphone:", error)
            alert("Could not access microphone. Please ensure permissions are granted.")
        }
    }

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop()
            setIsRecording(false)
            if (timerRef.current) {
                clearInterval(timerRef.current)
            }
            // Speech API logic removed for server action
        }
    }

    const handleSave = async () => {
        if (!audioBlob) return

        setIsTranscribing(true)
        try {
            const formData = new FormData()
            formData.append("file", audioBlob)

            const result = await transcribeAudio(formData)

            if (result.error) {
                alert(result.error) // Simple error handling
                onSave(audioBlob, recordingDuration, "")
            } else {
                onSave(audioBlob, recordingDuration, result.text)
            }
        } catch (e) {
            console.error(e)
            onSave(audioBlob, recordingDuration, "") // Save without transcript on fallback
        } finally {
            setIsTranscribing(false)
        }
    }

    const togglePlayback = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause()
            } else {
                audioRef.current.play()
            }
            setIsPlaying(!isPlaying)
        }
    }

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.onended = () => setIsPlaying(false)
        }
    }, [audioUrl])

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, "0")}`
    }

    if (audioUrl) {
        return (
            <div className="bg-[#1e1e1e] p-6 rounded-2xl border border-white/10 w-full max-w-md">
                <h3 className="text-white font-semibold mb-4">Preview Recording</h3>
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={togglePlayback}
                        className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:bg-gray-200 transition-colors"
                    >
                        {isPlaying ? <Pause size={20} /> : <Play size={20} />}
                    </button>
                    <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-white w-full opacity-50" />
                        {/* Visualizer placeholder */}
                    </div>
                    <span className="text-white/50 font-mono text-sm">{formatTime(recordingDuration)}</span>
                </div>
                <audio ref={audioRef} src={audioUrl} className="hidden" />

                <div className="flex justify-end gap-3">
                    <button
                        onClick={() => {
                            setAudioUrl(null)
                            setAudioBlob(null)
                        }}
                        className="px-4 py-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-2 text-sm"
                    >
                        <Trash2 size={16} /> Discard
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isTranscribing}
                        className="px-4 py-2 rounded-lg bg-white text-black font-medium hover:bg-gray-200 transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
                    >
                        {isTranscribing ? "Transcribing..." : "Save Recording"}
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-[#1e1e1e] p-8 rounded-2xl border border-white/10 flex flex-col items-center justify-center text-center w-full max-w-[400px]">
            <div className={`relative mb-6 transition-all duration-300 ${isRecording ? "scale-110" : "scale-100"}`}>
                {isRecording && (
                    <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping" />
                )}
                <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${isRecording ? "bg-red-500 text-white" : "bg-white text-black hover:bg-gray-200"
                        }`}
                >
                    {isRecording ? <Square size={28} fill="currentColor" /> : <Mic size={32} />}
                </button>
            </div>

            <h3 className="text-white font-semibold text-lg mb-2">
                {isRecording ? "Recording..." : "Record Voice Instructions"}
            </h3>
            <p className="text-white/50 text-sm mb-6">
                {isRecording ? formatTime(recordingDuration) : "Click the microphone to start recording"}
            </p>

            {!isRecording && (
                <button
                    onClick={onCancel}
                    className="text-white/40 hover:text-white transition-colors text-sm"
                >
                    Cancel
                </button>
            )}
        </div>
    )
}
