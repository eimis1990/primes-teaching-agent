"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { ChevronDown, LogOut } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export function UserProfileDropdown() {
  const { profile, signOut } = useAuth()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  if (!profile) return null

  const handleSignOut = async () => {
    await signOut()
    setIsOpen(false)
    router.push('/login')
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
      >
        <div className="w-8 h-8 rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.full_name || profile.email}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-sm font-semibold text-white">
              {(profile.full_name || profile.email).charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-white/60 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-64 bg-[#1B1C20] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50"
          >
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-white/10 flex items-center justify-center flex-shrink-0">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.full_name || profile.email}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-base font-semibold text-white">
                      {(profile.full_name || profile.email).charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {profile.full_name && (
                    <p className="text-sm font-semibold text-white truncate">
                      {profile.full_name}
                    </p>
                  )}
                  <p className="text-xs text-white/60 truncate">{profile.email}</p>
                </div>
              </div>
            </div>

            <div className="p-2">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left"
              >
                <LogOut className="w-4 h-4 text-white/60" />
                <span className="text-sm text-white">Sign out</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
