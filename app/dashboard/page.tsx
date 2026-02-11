"use client"

import { useEffect, useMemo, useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useProjects } from "@/contexts/project-context"
import { SidebarLayout } from "@/components/layouts/sidebar-layout"
import { StatCard } from "@/components/dashboard/stat-card"
import { QuickActionsCard } from "@/components/dashboard/quick-actions-card"
import { ProjectFolder } from "@/components/project-folder"
import { motion } from "framer-motion"
import { Users, ClipboardCheck, Book, TrendingUp, Plus, UserPlus, FileText } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export default function DashboardPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const { projects, loading: projectsLoading } = useProjects()
  const router = useRouter()
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set())
  const [dashboardStats, setDashboardStats] = useState({
    totalEmployees: 0,
    activeAssessments: 0,
    knowledgeBase: 0,
    completionRate: 0
  })

  // Check if platform owner (must be before any conditional returns)
  const platformOwnerEmail = process.env.NEXT_PUBLIC_PLATFORM_OWNER_EMAIL?.toLowerCase()
  const isPlatformOwner = platformOwnerEmail && user?.email?.toLowerCase() === platformOwnerEmail

  // All hooks must be called before any conditional returns
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [authLoading, user, router])

  // Redirect platform owner to their panel
  useEffect(() => {
    if (!authLoading && isPlatformOwner) {
      router.push('/platform-owner')
    }
  }, [authLoading, isPlatformOwner, router])

  // Fetch dashboard statistics
  useEffect(() => {
    async function fetchDashboardStats() {
      if (!profile?.org_id) return

      const supabase = createClient()

      try {
        // Fetch total employees in the organization
        const { count: employeesCount } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', profile.org_id)
          .eq('role', 'employee')

        // Fetch active assessments (sent, in_progress)
        const { count: activeAssessmentsCount } = await supabase
          .from('assessments')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', profile.org_id)
          .in('status', ['sent', 'in_progress'])

        // Fetch total documents in knowledge base
        const { count: documentsCount } = await supabase
          .from('documents')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', profile.org_id)

        // Fetch completion rate (completed / total sent assessments)
        const { count: totalSentAssessments } = await supabase
          .from('assessments')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', profile.org_id)
          .in('status', ['sent', 'in_progress', 'completed'])

        const { count: completedAssessments } = await supabase
          .from('assessments')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', profile.org_id)
          .eq('status', 'completed')

        const completionRate = totalSentAssessments && totalSentAssessments > 0
          ? Math.round((completedAssessments || 0) / totalSentAssessments * 100)
          : 0

        setDashboardStats({
          totalEmployees: employeesCount || 0,
          activeAssessments: activeAssessmentsCount || 0,
          knowledgeBase: documentsCount || 0,
          completionRate
        })
      } catch (error) {
        console.error('Error fetching dashboard stats:', error)
      }
    }

    if (profile?.org_id) {
      fetchDashboardStats()
    }
  }, [profile?.org_id])

  // Get latest 3 projects sorted by creation date (must be before conditional returns)
  const latestProjects = useMemo(() => {
    return [...projects]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3)
      .map(p => ({
        ...p,
        images: p.images || [],
        clipCount: p.documents ? p.documents.length : 0
      }))
  }, [projects])

  // Handler for folder clicks (must be before conditional returns)
  const handleFolderClick = useCallback((projectId: string) => {
    router.push(`/project/${projectId}`)
  }, [router])

  // Don't render anything if not authenticated or loading profile
  if (authLoading || !user || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-white/60">Loading...</div>
      </div>
    )
  }

  // Admin Dashboard Stats
  const adminStats = [
    {
      title: "Total Employees",
      value: dashboardStats.totalEmployees.toString(),
      changePercentage: "+0%",
      changeLabel: "than last week",
      icon: <Users className="w-5 h-5" />,
      cardClassName: "bg-gradient-to-br from-[#FFB26F] via-[#F58D56] to-[#E1733F] border-[#FFC897]/35 shadow-[0_10px_30px_-12px_rgba(245,141,86,0.6)]",
    },
    {
      title: "Active Assessments",
      value: dashboardStats.activeAssessments.toString(),
      changePercentage: "+0%",
      changeLabel: "than last week",
      icon: <ClipboardCheck className="w-5 h-5" />,
      cardClassName: "bg-gradient-to-br from-[#D86BFF] via-[#B35BEF] to-[#8E45DF] border-[#E0A3FF]/35 shadow-[0_10px_30px_-12px_rgba(179,91,239,0.58)]",
    },
    {
      title: "Knowledge Base",
      value: dashboardStats.knowledgeBase.toString(),
      changePercentage: "+0%",
      changeLabel: "than last week",
      icon: <Book className="w-5 h-5" />,
      cardClassName: "bg-gradient-to-br from-[#83B4FF] via-[#6998FF] to-[#4E79EC] border-[#A9C9FF]/35 shadow-[0_10px_30px_-12px_rgba(105,152,255,0.58)]",
    },
    {
      title: "Completion Rate",
      value: `${dashboardStats.completionRate}%`,
      changePercentage: "+0%",
      changeLabel: "than last week",
      icon: <TrendingUp className="w-5 h-5" />,
      cardClassName: "bg-gradient-to-br from-[#63DCC5] via-[#42BFA9] to-[#229884] border-[#8FE8D7]/35 shadow-[0_10px_30px_-12px_rgba(66,191,169,0.55)]",
    }
  ]

  // Quick actions for admins
  const quickActions = [
    {
      label: "Create New Assessment",
      description: "Design and assign assessments to employees",
      icon: <Plus className="w-4 h-4" />,
      onClick: () => router.push('/assessments/new')
    },
    {
      label: "Add Team Member",
      description: "Invite new employees to your organization",
      icon: <UserPlus className="w-4 h-4" />,
      onClick: () => router.push('/team-members')
    },
    {
      label: "Upload Documents",
      description: "Add new content to the knowledge base",
      icon: <FileText className="w-4 h-4" />,
      onClick: () => router.push('/knowledge-base')
    }
  ]

  return (
    <SidebarLayout breadcrumbs={[{ label: "Dashboard" }]}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">
            Admin Dashboard
          </h1>
          <p className="text-white/40 mt-1">
            Welcome back! Here's what's happening with your organization.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-5 items-start">
        {/* Left Column: Stats and Quick Actions */}
        <div className="flex-1 space-y-4">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-stretch">
            {adminStats.map((stat, index) => (
              <motion.div
                key={stat.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="h-full"
              >
                <StatCard
                  icon={stat.icon}
                  value={stat.value}
                  title={stat.title}
                  changePercentage={stat.changePercentage}
                  changeLabel={stat.changeLabel}
                  className={stat.cardClassName}
                />
              </motion.div>
            ))}
          </div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <QuickActionsCard
              title="Quick Actions"
              description="Common tasks and shortcuts"
              actions={quickActions}
            />
          </motion.div>
        </div>

        {/* Right Column: Latest Knowledge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
          className="w-[340px] flex-shrink-0"
        >
          <div className="bg-[#1B1C20] border border-white/10 rounded-2xl px-5 py-6 h-full">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-white">Latest Knowledge</h3>
                <p className="text-sm text-white/40 mt-1">Recently added folders</p>
              </div>
              <button
                onClick={() => router.push('/knowledge-base')}
                className="text-sm text-white/60 hover:text-white transition-colors"
              >
                View all
              </button>
            </div>

            {latestProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Book className="w-12 h-12 text-white/20 mb-4" />
                <p className="text-white/40 text-sm">No knowledge folders yet</p>
                <button
                  onClick={() => router.push('/knowledge-base')}
                  className="mt-4 text-sm text-white/60 hover:text-white transition-colors"
                >
                  Create your first folder
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {latestProjects.map((project, idx) => {
                  const isRemoving = removingIds.has(String(project.id))
                  return (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{
                        opacity: isRemoving ? 0 : 1,
                        scale: isRemoving ? 0.95 : 1,
                        y: isRemoving ? 10 : 0,
                      }}
                      transition={{
                        duration: 0.3,
                        delay: idx * 0.05,
                        ease: [0.25, 0.46, 0.45, 0.94],
                      }}
                    >
                      <ProjectFolder
                        project={project}
                        index={idx}
                        onClick={() => handleFolderClick(project.id)}
                      />
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </SidebarLayout>
  )
}
