"use client"

import { useState, useEffect } from "react"
import { X, Eye, EyeOff } from "lucide-react"
import { motion } from "framer-motion"
import type { Employee, CreateEmployeeInput } from "@/lib/types/assessments"
import { toast } from "sonner"

interface EmployeeFormProps {
  employee?: Employee | null
  onSubmit: (data: CreateEmployeeInput | (Partial<CreateEmployeeInput> & { id: string })) => Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
}

export function EmployeeForm({ employee, onSubmit, onCancel, isSubmitting }: EmployeeFormProps) {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    position: "",
    password: "",
  })
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (employee) {
      setFormData({
        full_name: employee.full_name,
        email: employee.email,
        position: employee.position || "",
        password: "",
      })
    }
  }, [employee])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate
    if (!formData.full_name.trim()) {
      toast.error("Full name is required")
      return
    }
    if (!formData.email.trim()) {
      toast.error("Email is required")
      return
    }
    if (!employee && !formData.password) {
      toast.error("Password is required for new employees")
      return
    }
    if (formData.password && formData.password.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }

    try {
      if (employee) {
        // Update existing employee
        const updateData: Partial<CreateEmployeeInput> & { id: string } = {
          id: employee.id,
          full_name: formData.full_name.trim(),
          email: formData.email.trim(),
          position: formData.position.trim() || undefined,
        }
        if (formData.password) {
          updateData.password = formData.password
        }
        await onSubmit(updateData)
      } else {
        // Create new employee
        await onSubmit({
          full_name: formData.full_name.trim(),
          email: formData.email.trim(),
          position: formData.position.trim() || undefined,
          password: formData.password,
        })
      }
    } catch (error) {
      console.error("Error submitting form:", error)
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
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/[0.08]">
          <h2 className="text-lg font-semibold text-white">
            {employee ? "Edit Employee" : "Add New Employee"}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 text-white/40 hover:text-white rounded-lg hover:bg-white/[0.04] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm text-white/60 mb-2">Full Name *</label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="John Doe"
              className="w-full bg-[#252525] border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-white/20 transition-colors placeholder:text-white/20"
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
            <label className="block text-sm text-white/60 mb-2">
              Password {employee ? "(leave empty to keep current)" : "*"}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={employee ? "Enter new password" : "Create password"}
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
            <p className="text-white/30 text-xs mt-1">Minimum 6 characters</p>
          </div>

          {/* Footer */}
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
              {isSubmitting ? "Saving..." : employee ? "Save Changes" : "Add Employee"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
