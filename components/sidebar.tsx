"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { LayoutGrid, Book, ClipboardCheck, Users, BarChart2, Settings, HelpCircle, MoreVertical, LogOut } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { motion, AnimatePresence } from "framer-motion"

interface MenuItem {
  name: string
  icon: React.ComponentType<{ className?: string }>
  path: string
  badge?: string
  adminOnly?: boolean
}

const menuItems: MenuItem[] = [
  { name: "Dashboard", icon: LayoutGrid, path: "/dashboard" },
  { name: "Knowledge Base", icon: Book, path: "/knowledge-base", adminOnly: true },
  { name: "Assessments", icon: ClipboardCheck, path: "/assessments" }, // Will be overridden for employees
  { name: "Employees", icon: Users, path: "/team-members", adminOnly: true },
  { name: "Analytics", icon: BarChart2, path: "/analytics", badge: "3", adminOnly: true },
]

const systemItems: MenuItem[] = [
  { name: "Settings", icon: Settings, path: "/settings" },
  { name: "Support", icon: HelpCircle, path: "/support" },
]

export function Sidebar() {
  const { profile, signOut } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [assessmentBadgeCount, setAssessmentBadgeCount] = useState<number>(0)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const pathname = usePathname()

  // Fetch unread assessment count for employees
  useEffect(() => {
    const fetchAssessmentCount = async () => {
      if (!profile || isAdmin) return

      try {
        const response = await fetch("/api/assessments/unread-count")
        const result = await response.json()
        setAssessmentBadgeCount(result.count || 0)
      } catch (error) {
        console.error("Error fetching assessment count:", error)
      }
    }

    fetchAssessmentCount()

    // Poll every 30 seconds for updates
    const interval = setInterval(fetchAssessmentCount, 30000)
    return () => clearInterval(interval)
  }, [profile, isAdmin, pathname]) // Re-fetch when navigation changes

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    await signOut()
    setIsUserMenuOpen(false)
    router.push('/login')
  }

  const isActive = (item: MenuItem) => {
    // Dashboard - works for both admin and employee
    if (item.path === "/dashboard") {
      return pathname === "/dashboard" || pathname === "/employee/dashboard"
    }
    // Knowledge Base (admin only)
    if (item.path === "/knowledge-base" && (pathname === "/knowledge-base" || pathname?.startsWith("/project"))) {
      return true
    }
    // Assessments - works for both admin and employee
    if (item.path === "/assessments") {
      return pathname?.startsWith("/assessments") || 
             pathname === "/employee/assessments" || 
             pathname?.startsWith("/employee/assessment")
    }
    // Team members (admin only)
    if (item.path === "/team-members" && pathname?.startsWith("/team-members")) {
      return true
    }
    return pathname === item.path
  }

  return (
    <aside className="hidden md:flex fixed left-0 top-0 w-[280px] h-screen bg-[#1B1C20] flex-col z-50 border-r border-white/[0.08]">
      {/* Logo */}
      <div className="px-6 py-6 flex items-center gap-2">
        <div className="w-6 h-6 bg-[#F34A23] rounded-md flex items-center justify-center">
          <div className="w-3 h-3 bg-white rounded-sm grid grid-cols-2 gap-0.5">
             <div className="bg-[#F34A23] rounded-[1px]"></div>
             <div className="bg-[#F34A23] rounded-[1px]"></div>
             <div className="bg-[#F34A23] rounded-[1px]"></div>
             <div className="bg-[#F34A23] rounded-[1px]"></div>
          </div>
        </div>
        <span className="text-white font-bold text-lg tracking-tight">AdminPanel</span>
      </div>

      {/* Menu */}
      <div className="px-4 flex-1 overflow-y-auto">
        <div className="mb-6">
          <h3 className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-3 px-2">Menu</h3>
          <div className="space-y-1">
            {menuItems
              .filter((item) => !item.adminOnly || isAdmin)
              .map((item) => {
                // Override paths for employees: redirect to employee-specific routes
                let itemPath = item.path
                if (!isAdmin) {
                  if (item.path === "/dashboard") {
                    itemPath = "/employee/dashboard"
                  } else if (item.path === "/assessments") {
                    itemPath = "/employee/assessments"
                  }
                }
                const active = isActive(item)
                // Show badge for assessments if employee has new assessments
                const showBadge = item.badge || (item.path === "/assessments" && !isAdmin && assessmentBadgeCount > 0)
                const badgeText = item.path === "/assessments" && !isAdmin && assessmentBadgeCount > 0 
                  ? assessmentBadgeCount.toString() 
                  : item.badge

                return (
                  <Link
                    key={item.name}
                    href={itemPath}
                    className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                      active
                        ? "bg-[#35383D] text-white"
                        : "text-white/60 hover:text-white hover:bg-white/[0.04]"
                    }`}
                  >
                    <item.icon className={`w-5 h-5 ${active ? "text-white" : "text-white/60 group-hover:text-white"}`} />
                    <span className="flex-1 text-left">{item.name}</span>
                    {showBadge && (
                      <span className={`text-white text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        item.path === "/assessments" && !isAdmin && assessmentBadgeCount > 0
                          ? "bg-red-500"
                          : "bg-[#35383D] border border-white/10"
                      }`}>
                        {badgeText}
                      </span>
                    )}
                  </Link>
                )
              })}
          </div>
        </div>

        <div>
          <h3 className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-3 px-2">System</h3>
          <div className="space-y-1">
            {systemItems.map((item) => {
              const active = isActive(item)
              return (
                <Link
                  key={item.name}
                  href={item.path}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                    active
                      ? "bg-[#35383D] text-white"
                      : "text-white/60 hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${active ? "text-white" : "text-white/60 group-hover:text-white"}`} />
                  <span className="flex-1 text-left">{item.name}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* User Card */}
      <div className="px-4 mb-2" ref={userMenuRef}>
        <div
          className="group bg-[#252525] hover:bg-[#2a2a2a] rounded-xl p-3 flex items-center gap-3 border border-white/[0.04] cursor-pointer transition-all duration-200 relative"
          onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
        >
          <div className="w-10 h-10 rounded-full overflow-hidden bg-white/10 flex-shrink-0 group-hover:ring-1 group-hover:ring-white/20 transition-all">
             {profile?.avatar_url ? (
               <img src={profile.avatar_url} alt="User" className="w-full h-full object-cover" />
             ) : (
               <div className="w-full h-full flex items-center justify-center bg-[#F34A23] text-white font-medium">
                 {profile?.full_name?.[0] || "A"}
               </div>
             )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate group-hover:text-white transition-colors">{profile?.full_name || "User"}</p>
            <p className="text-white/40 text-xs truncate group-hover:text-white/50 transition-colors capitalize">{profile?.role || "Employee"}</p>
          </div>
          <MoreVertical className="w-4 h-4 text-white/20 group-hover:text-white/60 transition-colors" />

          <AnimatePresence>
            {isUserMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.1 }}
                className="absolute bottom-full left-0 right-0 mb-2 bg-[#252525] border border-white/10 rounded-xl shadow-xl overflow-hidden z-50"
              >
                <div className="p-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSignOut()
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left text-red-400"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm">Sign out</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-white/[0.04]">
        <p className="text-white/20 text-xs text-center">Admin Panel</p>
      </div>
    </aside>
  )
}
