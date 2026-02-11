"use client"

import { useState, useEffect } from "react"
import { Save, X, Edit3, Eye } from "lucide-react"

interface DocumentEditorProps {
    initialContent: string
    title: string
    onSave: (content: string) => void
    onClose: () => void
}

export function DocumentEditor({ initialContent, title, onSave, onClose }: DocumentEditorProps) {
    const [content, setContent] = useState(initialContent)
    const [isPreview, setIsPreview] = useState(false)

    return (
        <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl overflow-hidden flex flex-col h-[600px] max-w-4xl w-full mx-auto shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#151515]">
                <h3 className="font-semibold text-white">{title}</h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsPreview(!isPreview)}
                        className="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                        title={isPreview ? "Edit" : "Preview"}
                    >
                        {isPreview ? <Edit3 size={18} /> : <Eye size={18} />}
                    </button>
                    <button
                        onClick={() => onSave(content)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
                    >
                        <Save size={18} /> Save
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* Editor/Preview Area */}
            <div className="flex-1 overflow-hidden relative">
                {isPreview ? (
                    <div className="h-full overflow-y-auto p-8 prose prose-invert max-w-none">
                        {/* Simple Markdown Rendering - for now just preserving whitespace/lines */}
                        {content.split('\n').map((line, i) => (
                            <div key={i} className={line.startsWith('#') ? "font-bold text-xl my-4" : "my-1"}>
                                {line}
                            </div>
                        ))}
                    </div>
                ) : (
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="w-full h-full bg-[#1e1e1e] text-white p-8 resize-none outline-none font-mono text-sm leading-relaxed"
                        placeholder="Start typing..."
                        spellCheck={false}
                    />
                )}
            </div>
        </div>
    )
}
