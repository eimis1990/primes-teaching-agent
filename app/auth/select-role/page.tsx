"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LayoutDashboard, Users, Loader2 } from "lucide-react"

export default function SelectRolePage() {
  const router = useRouter()
  const [loading, setLoading] = useState<"admin" | "employee" | null>(null)

  const selectAdmin = () => {
    setLoading("admin")
    // Store preference
    localStorage.setItem("preferred_role", "admin")
    router.push("/dashboard")
  }

  const selectEmployee = async () => {
    setLoading("employee")
    try {
      // Generate employee session cookie
      const response = await fetch("/api/auth/employee-session", {
        method: "POST",
      })

      if (response.ok) {
        // Store preference
        localStorage.setItem("preferred_role", "employee")
        router.push("/employee/dashboard")
      } else {
        console.error("Failed to create employee session")
        setLoading(null)
      }
    } catch (error) {
      console.error("Error selecting employee role:", error)
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="w-12 h-12 bg-[#F34A23] rounded-xl flex items-center justify-center mx-auto mb-4">
            <div className="w-6 h-6 bg-white rounded-md grid grid-cols-2 gap-0.5 p-1">
              <div className="bg-[#F34A23] rounded-[2px]"></div>
              <div className="bg-[#F34A23] rounded-[2px]"></div>
              <div className="bg-[#F34A23] rounded-[2px]"></div>
              <div className="bg-[#F34A23] rounded-[2px]"></div>
            </div>
          </div>
          <h1 className="text-2xl font-semibold text-white mb-2">Choose Your Portal</h1>
          <p className="text-white/40">
            You have access to both portals. Select where you'd like to go.
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Admin Portal Card */}
          <button
            onClick={selectAdmin}
            disabled={loading !== null}
            className="bg-[#1B1C20] border border-white/[0.08] rounded-2xl p-6 text-left hover:border-white/20 hover:bg-[#1B1C20]/80 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="w-14 h-14 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-colors">
              {loading === "admin" ? (
                <Loader2 className="w-7 h-7 text-blue-400 animate-spin" />
              ) : (
                <LayoutDashboard className="w-7 h-7 text-blue-400" />
              )}
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">Admin Portal</h2>
            <p className="text-white/40 text-sm">
              Manage assessments, employees, and knowledge base content.
            </p>
          </button>

          {/* Employee Portal Card */}
          <button
            onClick={selectEmployee}
            disabled={loading !== null}
            className="bg-[#1B1C20] border border-white/[0.08] rounded-2xl p-6 text-left hover:border-white/20 hover:bg-[#1B1C20]/80 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="w-14 h-14 bg-[#F34A23]/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#F34A23]/20 transition-colors">
              {loading === "employee" ? (
                <Loader2 className="w-7 h-7 text-[#F34A23] animate-spin" />
              ) : (
                <Users className="w-7 h-7 text-[#F34A23]" />
              )}
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">Employee Portal</h2>
            <p className="text-white/40 text-sm">
              View and complete your assigned assessments.
            </p>
          </button>
        </div>

        {/* Footer note */}
        <p className="text-white/20 text-xs text-center mt-8">
          Your preference will be remembered for future logins.
        </p>
      </div>
    </div>
  )
}
