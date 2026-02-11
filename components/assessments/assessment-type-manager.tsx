"use client"

import { useState, useEffect } from "react"
import { Plus, Edit2, Trash2, X, Check } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import type { AssessmentType, CreateAssessmentTypeInput } from "@/lib/types/assessments"
import { toast } from "sonner"

interface AssessmentTypeManagerProps {
  types: AssessmentType[]
  onRefresh: () => void
}

const colorOptions = [
  "#6366f1", // Indigo
  "#F34A23", // Orange (brand)
  "#10B981", // Emerald
  "#3B82F6", // Blue
  "#8B5CF6", // Violet
  "#EC4899", // Pink
  "#F59E0B", // Amber
  "#06B6D4", // Cyan
]

export function AssessmentTypeManager({ types, onRefresh }: AssessmentTypeManagerProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newType, setNewType] = useState<CreateAssessmentTypeInput>({
    name: "",
    description: "",
    color: "#6366f1",
  })
  const [editType, setEditType] = useState<CreateAssessmentTypeInput & { id: string }>({
    id: "",
    name: "",
    description: "",
    color: "#6366f1",
  })

  const handleCreate = async () => {
    if (!newType.name.trim()) {
      toast.error("Name is required")
      return
    }

    try {
      const response = await fetch("/api/assessments/types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newType),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to create assessment type")
      }

      toast.success("Assessment type created")
      setIsCreating(false)
      setNewType({ name: "", description: "", color: "#6366f1" })
      onRefresh()
    } catch (error) {
      console.error("Error creating type:", error)
      toast.error(error instanceof Error ? error.message : "Failed to create assessment type")
    }
  }

  const handleEdit = async () => {
    if (!editType.name.trim()) {
      toast.error("Name is required")
      return
    }

    try {
      const response = await fetch("/api/assessments/types", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editType),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to update assessment type")
      }

      toast.success("Assessment type updated")
      setEditingId(null)
      onRefresh()
    } catch (error) {
      console.error("Error updating type:", error)
      toast.error(error instanceof Error ? error.message : "Failed to update assessment type")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this assessment type?")) return

    try {
      const response = await fetch(`/api/assessments/types?id=${id}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete assessment type")
      }

      toast.success("Assessment type deleted")
      onRefresh()
    } catch (error) {
      console.error("Error deleting type:", error)
      toast.error(error instanceof Error ? error.message : "Failed to delete assessment type")
    }
  }

  const startEditing = (type: AssessmentType) => {
    setEditingId(type.id)
    setEditType({
      id: type.id,
      name: type.name,
      description: type.description || "",
      color: type.color,
    })
  }

  return (
    <div className="space-y-4">
      {/* Type List */}
      <div className="space-y-2">
        {types.map((type) => (
          <div
            key={type.id}
            className="bg-[#252525] rounded-xl p-4 border border-white/[0.04]"
          >
            {editingId === type.id ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={editType.name}
                    onChange={(e) => setEditType({ ...editType, name: e.target.value })}
                    placeholder="Type name"
                    className="flex-1 bg-[#1B1C20] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/20"
                  />
                  <div className="flex items-center gap-1">
                    {colorOptions.map((color) => (
                      <button
                        key={color}
                        onClick={() => setEditType({ ...editType, color })}
                        className={`w-6 h-6 rounded-full transition-transform ${
                          editType.color === color ? "scale-125 ring-2 ring-white/20" : ""
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <input
                  type="text"
                  value={editType.description || ""}
                  onChange={(e) => setEditType({ ...editType, description: e.target.value })}
                  placeholder="Description (optional)"
                  className="w-full bg-[#1B1C20] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/20"
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setEditingId(null)}
                    className="p-2 text-white/60 hover:text-white rounded-lg hover:bg-white/[0.04] transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleEdit}
                    className="p-2 text-emerald-400 hover:text-emerald-300 rounded-lg hover:bg-emerald-500/10 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: type.color }}
                  />
                  <div>
                    <p className="text-white text-sm font-medium">{type.name}</p>
                    {type.description && (
                      <p className="text-white/40 text-xs">{type.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => startEditing(type)}
                    className="p-2 text-white/40 hover:text-white rounded-lg hover:bg-white/[0.04] transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(type.id)}
                    className="p-2 text-white/40 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create New */}
      <AnimatePresence>
        {isCreating ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-[#252525] rounded-xl p-4 border border-white/[0.04] space-y-3"
          >
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={newType.name}
                onChange={(e) => setNewType({ ...newType, name: e.target.value })}
                placeholder="Type name"
                className="flex-1 bg-[#1B1C20] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/20"
                autoFocus
              />
              <div className="flex items-center gap-1">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewType({ ...newType, color })}
                    className={`w-6 h-6 rounded-full transition-transform ${
                      newType.color === color ? "scale-125 ring-2 ring-white/20" : ""
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <input
              type="text"
              value={newType.description || ""}
              onChange={(e) => setNewType({ ...newType, description: e.target.value })}
              placeholder="Description (optional)"
              className="w-full bg-[#1B1C20] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-white/20"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setIsCreating(false)
                  setNewType({ name: "", description: "", color: "#6366f1" })
                }}
                className="px-4 py-2 text-white/60 hover:text-white rounded-lg hover:bg-white/[0.04] transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-[#F34A23] hover:bg-[#E04420] text-white rounded-lg transition-colors text-sm font-medium"
              >
                Create Type
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setIsCreating(true)}
            className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-white/10 rounded-xl text-white/40 hover:text-white hover:border-white/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm">Add Assessment Type</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
