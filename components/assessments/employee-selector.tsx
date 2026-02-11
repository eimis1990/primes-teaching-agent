"use client"

import { useState, useEffect } from "react"
import { Check, Users, Plus, Search, Eye, EyeOff } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import type { Employee, CreateEmployeeInput } from "@/lib/types/assessments"
import { toast } from "sonner"

interface EmployeeSelectorProps {
  selectedEmployeeId: string | null
  onSelectionChange: (employeeId: string | null) => void
  onEmployeeCreated?: (employee: Employee) => void
}

export function EmployeeSelector({
  selectedEmployeeId,
  onSelectionChange,
  onEmployeeCreated,
}: EmployeeSelectorProps) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [showCreateForm, setShowCreateForm] = useState(false)

  useEffect(() => {
    loadEmployees()
  }, [])

  const loadEmployees = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/employees")
      const result = await response.json()

      if (response.ok) {
        setEmployees(result.data || [])
      } else {
        console.error("Error loading employees:", result.error)
      }
    } catch (error) {
      console.error("Error loading employees:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateEmployee = async (data: CreateEmployeeInput) => {
    try {
      const response = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to create employee")
      }

      toast.success("Employee created")
      setShowCreateForm(false)
      await loadEmployees()

      // Auto-select the new employee
      onSelectionChange(result.data.id)
      onEmployeeCreated?.(result.data)
    } catch (error) {
      console.error("Error creating employee:", error)
      toast.error(error instanceof Error ? error.message : "Failed to create employee")
    }
  }

  const filteredEmployees = employees.filter((employee) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      employee.full_name.toLowerCase().includes(query) ||
      employee.email.toLowerCase().includes(query) ||
      employee.position?.toLowerCase().includes(query)
    )
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-white/60">Loading employees...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search and Create */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Search employees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#252525] border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-[#F34A23]/60 transition-colors placeholder:text-white/20"
          />
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#252525] border border-white/10 rounded-lg text-white/70 hover:text-white hover:border-white/20 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm">New</span>
        </button>
      </div>

      {/* Employee List or Empty State */}
      {employees.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 bg-[#1B1C20] rounded-xl border border-white/[0.08]">
          <div className="w-16 h-16 bg-[#35383D] rounded-2xl flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-white/40" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No Employees Yet</h3>
          <p className="text-white/40 text-center max-w-md mb-4">
            Create your first employee to assign this assessment to them.
          </p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 bg-[#F34A23] hover:bg-[#E04420] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Employee</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredEmployees.map((employee) => {
            const isSelected = selectedEmployeeId === employee.id

            return (
              <motion.button
                key={employee.id}
                onClick={() => onSelectionChange(isSelected ? null : employee.id)}
                className={`relative flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${
                  isSelected
                    ? "bg-[#F34A23]/10 border-[#F34A23]/50 shadow-md shadow-[#F34A23]/10"
                    : "bg-[#252525] border-white/[0.08] hover:border-white/15"
                }`}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                {/* Avatar */}
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

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-medium truncate">{employee.full_name}</h3>
                  <p className="text-white/40 text-sm truncate">{employee.email}</p>
                  {employee.position && (
                    <p className="text-white/30 text-xs truncate">{employee.position}</p>
                  )}
                </div>

                {/* Selection indicator */}
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                    isSelected
                      ? "bg-[#F34A23] text-white"
                      : "bg-white/10 text-transparent"
                  }`}
                >
                  <Check className="w-4 h-4" />
                </div>
              </motion.button>
            )
          })}
        </div>
      )}

      {filteredEmployees.length === 0 && employees.length > 0 && (
        <p className="text-white/40 text-sm text-center py-4">
          No employees match your search
        </p>
      )}

      {/* Create Employee Modal */}
      <AnimatePresence>
        {showCreateForm && (
          <CreateEmployeeModal
            onSubmit={handleCreateEmployee}
            onCancel={() => setShowCreateForm(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// Inline create employee modal
function CreateEmployeeModal({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: CreateEmployeeInput) => Promise<void>
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    position: "",
    password: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.full_name.trim()) {
      toast.error("Full name is required")
      return
    }
    if (!formData.email.trim()) {
      toast.error("Email is required")
      return
    }
    if (!formData.password || formData.password.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit({
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        position: formData.position.trim() || undefined,
        password: formData.password,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-[#1B1C20] rounded-2xl border border-white/10 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-white/[0.08]">
          <h2 className="text-lg font-semibold text-white">Add New Employee</h2>
          <p className="text-white/40 text-sm mt-1">
            Create a new employee to assign this assessment
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-white/60 mb-2">Full Name *</label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="John Doe"
              className="w-full bg-[#252525] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-white/20 transition-colors placeholder:text-white/20"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-2">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="john@example.com"
              className="w-full bg-[#252525] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-white/20 transition-colors placeholder:text-white/20"
            />
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-2">Position</label>
            <input
              type="text"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              placeholder="Software Engineer"
              className="w-full bg-[#252525] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-white/20 transition-colors placeholder:text-white/20"
            />
          </div>

          <div>
            <label className="block text-sm text-white/60 mb-2">Password *</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Create password"
                className="w-full bg-[#252525] border border-white/10 rounded-lg px-4 py-3 pr-12 text-white focus:outline-none focus:border-white/20 transition-colors placeholder:text-white/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-white/60 hover:text-white rounded-lg hover:bg-white/[0.04] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-[#F34A23] hover:bg-[#E04420] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
            >
              {isSubmitting ? "Creating..." : "Create & Select"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
