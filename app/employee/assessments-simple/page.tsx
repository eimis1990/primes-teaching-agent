"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"

export default function SimpleAssessmentsPage() {
  const { user, profile, loading } = useAuth()
  const [assessments, setAssessments] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
      return
    }

    if (user) {
      fetch("/api/assessments")
        .then(res => res.json())
        .then(data => {
          console.log("Assessments loaded:", data)
          if (data.data) {
            setAssessments(data.data)
          } else if (data.error) {
            setError(data.error)
          }
        })
        .catch(err => {
          console.error("Fetch error:", err)
          setError(err.message)
        })
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-white">Redirecting to login...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">My Assessments (Simple)</h1>
        
        <div className="mb-4 bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <p className="text-blue-400 text-sm">
            ✅ Logged in as: <strong>{user.email}</strong>
          </p>
          <p className="text-blue-400 text-sm">
            ✅ Role: <strong>{profile?.role || "Loading..."}</strong>
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <p className="text-red-400">Error: {error}</p>
          </div>
        )}

        {assessments.length === 0 && !error && (
          <div className="bg-[#1B1C20] border border-white/10 rounded-xl p-12 text-center">
            <p className="text-white/60 mb-2">No assessments found</p>
            <p className="text-white/40 text-sm">
              {profile?.role === "employee" 
                ? "No assessments assigned to you yet." 
                : "You haven't created any assessments yet."}
            </p>
          </div>
        )}

        {assessments.length > 0 && (
          <div className="space-y-4">
            {assessments.map((assessment) => (
              <div
                key={assessment.id}
                onClick={() => {
                  if (assessment.status === "completed") {
                    router.push(`/employee/assessment/${assessment.id}/results`)
                  } else {
                    router.push(`/employee/assessment/${assessment.id}`)
                  }
                }}
                className="bg-[#1B1C20] border border-white/10 rounded-xl p-6 hover:border-white/20 transition-colors cursor-pointer"
              >
                <h3 className="text-lg font-semibold text-white mb-2">
                  {assessment.title}
                </h3>
                <p className="text-white/60 text-sm mb-3">
                  {assessment.description || "No description"}
                </p>
                <div className="flex items-center gap-4">
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                    {assessment.status}
                  </span>
                  {assessment.due_date && (
                    <span className="text-white/40 text-xs">
                      Due: {new Date(assessment.due_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
