"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function EmployeeLoginPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to main login page - employees now use Google OAuth
    router.replace("/login")
  }, [router])

  return (
    <div className="min-h-screen bg-[#0D0D0F] flex items-center justify-center">
      <div className="flex items-center gap-2 text-white/60">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Redirecting to login...</span>
      </div>
    </div>
  )
}
