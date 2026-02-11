"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import {
  LayoutGrid,
  Book,
  ClipboardCheck,
  Users,
  BarChart2,
  Settings,
  HelpCircle,
  LogOut,
  ChevronDown,
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuBadge,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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
  { name: "Assessments", icon: ClipboardCheck, path: "/assessments" },
  { name: "Employees", icon: Users, path: "/team-members", adminOnly: true },
  { name: "Analytics", icon: BarChart2, path: "/analytics", badge: "3", adminOnly: true },
]

const systemItems: MenuItem[] = [
  { name: "Settings", icon: Settings, path: "/settings" },
  { name: "Support", icon: HelpCircle, path: "/support" },
]

export function AppSidebar() {
  const { profile, signOut, user } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const [assessmentBadgeCount, setAssessmentBadgeCount] = useState<number>(0)
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
  }, [profile, isAdmin, pathname])

  const handleSignOut = async () => {
    await signOut()
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
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href={isAdmin ? "/dashboard" : "/employee/dashboard"}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-[#F34A23]">
                  <div className="grid size-4 grid-cols-2 gap-0.5">
                    <div className="rounded-[1px] bg-white"></div>
                    <div className="rounded-[1px] bg-white"></div>
                    <div className="rounded-[1px] bg-white"></div>
                    <div className="rounded-[1px] bg-white"></div>
                  </div>
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">AdminPanel</span>
                  <span className="truncate text-xs">Assessment Platform</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems
                .filter((item) => !item.adminOnly || isAdmin)
                .map((item) => {
                  // Override paths for employees
                  let itemPath = item.path
                  if (!isAdmin) {
                    if (item.path === "/dashboard") {
                      itemPath = "/employee/dashboard"
                    } else if (item.path === "/assessments") {
                      itemPath = "/employee/assessments"
                    }
                  }
                  const active = isActive(item)
                  const showBadge = item.badge || (item.path === "/assessments" && !isAdmin && assessmentBadgeCount > 0)
                  const badgeText = item.path === "/assessments" && !isAdmin && assessmentBadgeCount > 0 
                    ? assessmentBadgeCount.toString() 
                    : item.badge

                  return (
                    <SidebarMenuItem key={item.name}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.name}>
                        <Link href={itemPath}>
                          <item.icon />
                          <span>{item.name}</span>
                        </Link>
                      </SidebarMenuButton>
                      {showBadge && (
                        <SidebarMenuBadge className={
                          item.path === "/assessments" && !isAdmin && assessmentBadgeCount > 0
                            ? "bg-red-500 text-white"
                            : ""
                        }>
                          {badgeText}
                        </SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  )
                })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemItems.map((item) => {
                const active = isActive(item)
                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.name}>
                      <Link href={item.path}>
                        <item.icon />
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-[#F34A23] text-white text-sm font-medium">
                    {profile?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || "A"}
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{profile?.full_name || "User"}</span>
                    <span className="truncate text-xs capitalize">{profile?.role || "Employee"}</span>
                  </div>
                  <ChevronDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem onClick={handleSignOut} className="text-red-500 cursor-pointer">
                  <LogOut className="mr-2 size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      
      <SidebarRail />
    </Sidebar>
  )
}
