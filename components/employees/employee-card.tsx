"use client"

import { useState, useRef, useEffect } from "react"
import { MoreHorizontal, Edit2, Trash2, Mail } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import type { Employee } from "@/lib/types/assessments"

interface EmployeeCardProps {
  employee: Employee
  onEdit: (employee: Employee) => void
  onDelete: (id: string) => void
}

export function EmployeeCard({ employee, onEdit, onDelete }: EmployeeCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  return (
    <div className="bg-[#252525] rounded-xl p-4 border border-white/[0.04] hover:border-white/10 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-white/10 flex-shrink-0">
            {employee.avatar_url ? (
              <img
                src={employee.avatar_url}
                alt={employee.full_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#F34A23] to-[#E04420] text-white text-lg font-medium">
                {employee.full_name[0]}
              </div>
            )}
          </div>
          <div>
            <h3 className="text-white font-medium">{employee.full_name}</h3>
            {employee.position && (
              <p className="text-white/40 text-sm">{employee.position}</p>
            )}
          </div>
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 text-white/40 hover:text-white rounded-lg hover:bg-white/[0.04] transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.1 }}
                className="absolute top-full right-0 mt-1 bg-[#1B1C20] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50 min-w-[140px]"
              >
                <div className="p-1">
                  <button
                    onClick={() => {
                      onEdit(employee)
                      setMenuOpen(false)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left text-white/80 text-sm"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => {
                      onDelete(employee.id)
                      setMenuOpen(false)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left text-red-400 text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-white/[0.04]">
        <div className="flex items-center gap-2 text-white/40 text-sm">
          <Mail className="w-4 h-4" />
          <span className="truncate">{employee.email}</span>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-white/30 text-xs">Added {formatDate(employee.created_at)}</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              employee.is_active
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-white/10 text-white/40"
            }`}
          >
            {employee.is_active ? "Active" : "Inactive"}
          </span>
        </div>
      </div>
    </div>
  )
}
