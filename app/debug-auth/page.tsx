"use client"

import { useAuth } from "@/contexts/auth-context"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function DebugAuthPage() {
  const { user, profile, loading } = useAuth()
  const [assessments, setAssessments] = useState<any>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (user) {
      fetch("/api/assessments")
        .then(res => res.json())
        .then(data => {
          console.log("API Response:", data)
          setAssessments(data)
        })
        .catch(err => {
          console.error("API Error:", err)
          setApiError(err.message)
        })
    }
  }, [user])

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-white mb-8">🐛 Auth Debug Page</h1>

        {/* Auth State */}
        <div className="bg-[#1B1C20] border border-white/10 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">1️⃣ Auth State</h2>
          <div className="space-y-2 text-sm">
            <p className="text-white/60">
              Loading: <span className={loading ? "text-amber-400" : "text-emerald-400"}>
                {loading ? "YES ⏳" : "NO ✅"}
              </span>
            </p>
            <p className="text-white/60">
              User: <span className={user ? "text-emerald-400" : "text-red-400"}>
                {user ? `✅ ${user.email}` : "❌ No user"}
              </span>
            </p>
            <p className="text-white/60">
              Profile: <span className={profile ? "text-emerald-400" : "text-red-400"}>
                {profile ? "✅ Loaded" : "❌ Not loaded"}
              </span>
            </p>
          </div>
        </div>

        {/* Profile Data */}
        {profile && (
          <div className="bg-[#1B1C20] border border-white/10 rounded-xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">2️⃣ Profile Data</h2>
            <div className="bg-[#0D0E10] rounded-lg p-4 overflow-auto">
              <pre className="text-xs text-white/80">
                {JSON.stringify(profile, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* API Response */}
        <div className="bg-[#1B1C20] border border-white/10 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">3️⃣ API Response (/api/assessments)</h2>
          {!user ? (
            <p className="text-white/40">Waiting for user to load...</p>
          ) : apiError ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <p className="text-red-400">❌ Error: {apiError}</p>
            </div>
          ) : !assessments ? (
            <p className="text-white/40">Loading...</p>
          ) : (
            <div className="bg-[#0D0E10] rounded-lg p-4 overflow-auto max-h-96">
              <pre className="text-xs text-white/80">
                {JSON.stringify(assessments, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Navigation Test */}
        <div className="bg-[#1B1C20] border border-white/10 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">4️⃣ Navigation Test</h2>
          <div className="space-y-3">
            <button
              onClick={() => router.push("/employee/assessments")}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-lg font-medium"
            >
              → Go to /employee/assessments
            </button>
            <button
              onClick={() => router.push("/assessments")}
              className="w-full bg-green-500 hover:bg-green-600 text-white px-4 py-3 rounded-lg font-medium"
            >
              → Go to /assessments (admin)
            </button>
          </div>
        </div>

        {/* Console Instructions */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-amber-400 mb-4">📋 Instructions</h2>
          <ol className="space-y-2 text-sm text-white/80 list-decimal list-inside">
            <li>Open browser console (F12)</li>
            <li>Check for any errors (red text)</li>
            <li>Take a screenshot of this entire page</li>
            <li>Try clicking the navigation buttons above</li>
            <li>Share what you see</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
