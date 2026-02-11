"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { SidebarLayout } from "@/components/layouts/sidebar-layout"
import { useAuth } from "@/contexts/auth-context"
import { PageHeader } from "@/components/dashboard/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Plus, Settings } from "lucide-react"
import { AssessmentList } from "@/components/assessments/assessment-list"
import type { Assessment, AssessmentStatus } from "@/lib/types/assessments"
import { createClient } from "@/lib/supabase/client"

const statusFilters: { label: string; value: AssessmentStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Active", value: "in_progress" },
  { label: "Pending", value: "sent" },
  { label: "Completed", value: "completed" },
]

export default function AssessmentsPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<AssessmentStatus | "all">("all")
  const [searchQuery, setSearchQuery] = useState("")
  
  const isAdmin = profile?.role === 'admin'

  const loadAssessments = useCallback(async () => {
    if (!user) return

    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("assessments")
        .select(`
          *,
          employee:users!employee_id(*),
          assessment_type:assessment_types(*)
        `)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error loading assessments:", error)
        console.error("Error details:", error)
        return
      }

      setAssessments(data || [])
    } catch (error) {
      console.error("Error loading assessments:", error)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [authLoading, user, router])

  useEffect(() => {
    if (user) {
      loadAssessments()
    }
  }, [user, loadAssessments])

  const filteredAssessments = assessments.filter((assessment) => {
    const matchesFilter = activeFilter === "all" || assessment.status === activeFilter
    const matchesSearch = searchQuery === "" ||
      assessment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assessment.employee?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  // Count assessments by status
  const statusCounts = {
    all: assessments.length,
    in_progress: assessments.filter(a => a.status === "in_progress").length,
    sent: assessments.filter(a => a.status === "sent").length,
    completed: assessments.filter(a => a.status === "completed").length,
  }

  if (authLoading || !user) {
    return (
      <SidebarLayout breadcrumbs={[{ label: "Assessments" }]}>
        <div className="flex items-center justify-center py-20">
          <div className="text-white/60">Loading...</div>
        </div>
      </SidebarLayout>
    )
  }

  return (
    <SidebarLayout breadcrumbs={[{ label: "Assessments" }]}>
      <div>
        <PageHeader
          title="Assessments"
          description={isAdmin ? "Manage employee evaluations and assessments" : "View and complete your assigned assessments"}
          actions={
            <>
              {isAdmin && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push("/assessments/settings")}
                    className="text-white/60 hover:text-white hidden sm:flex"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Types
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => router.push("/assessments/new")}
                    className="bg-[#F34A23] hover:bg-[#E04420]"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Assessment
                  </Button>
                </>
              )}
            </>
          }
        />

        {/* Search and Filters */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="mb-6"
        >
          <Card className="border-white/[0.08] bg-[#1B1C20]/95 py-0 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.7)]">
            <CardContent className="px-4 py-4">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="relative flex-1 max-w-full lg:max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    type="text"
                    placeholder="Search assessments..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-10 rounded-lg border-white/10 bg-[#181A1F] pl-10 pr-4 text-white placeholder:text-white/35 focus-visible:border-white/25 focus-visible:ring-white/10"
                  />
                </div>

                {/* Status Filters - Using Shadcn Tabs */}
                <Tabs
                  value={activeFilter}
                  onValueChange={(value) => setActiveFilter(value as AssessmentStatus | "all")}
                  className="lg:ml-auto"
                >
                  <TabsList className="h-auto w-full lg:w-auto bg-[#181A1F] border border-white/10 p-1 flex flex-wrap">
                    {statusFilters.map((filter) => {
                      const count = statusCounts[filter.value as keyof typeof statusCounts] || 0
                      return (
                        <TabsTrigger
                          key={filter.value}
                          value={filter.value}
                          className="text-white/70 data-[state=active]:bg-[#F34A23] data-[state=active]:text-white data-[state=active]:shadow-md px-3"
                        >
                          {filter.label} ({count})
                        </TabsTrigger>
                      )
                    })}
                  </TabsList>
                </Tabs>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-white/60">Loading assessments...</div>
          </div>
        ) : filteredAssessments.length === 0 ? (
          <EmptyState
            hasAssessments={assessments.length > 0}
            onCreateNew={() => router.push("/assessments/new")}
            isAdmin={isAdmin}
          />
        ) : (
          <AssessmentList
            assessments={filteredAssessments}
            onRefresh={loadAssessments}
          />
        )}
      </div>
    </SidebarLayout>
  )
}

function EmptyState({
  hasAssessments,
  onCreateNew,
  isAdmin,
}: {
  hasAssessments: boolean
  onCreateNew: () => void
  isAdmin: boolean
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex flex-col items-center justify-center py-20"
    >
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="w-24 h-24 bg-[#35383D] rounded-2xl flex items-center justify-center mb-6"
      >
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-white/40"
        >
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      </motion.div>
      <motion.h3 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="text-xl font-semibold text-white mb-2"
      >
        {hasAssessments ? "No assessments match your filters" : isAdmin ? "No assessments yet" : "No assessments assigned"}
      </motion.h3>
      <motion.p 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        className="text-white/40 text-center max-w-md mb-6"
      >
        {hasAssessments
          ? "Try adjusting your search or filter criteria to find what you're looking for."
          : isAdmin 
            ? "Create your first assessment to start evaluating your team's knowledge and skills."
            : "Your administrator hasn't assigned any assessments to you yet."}
      </motion.p>
      {!hasAssessments && isAdmin && (
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onCreateNew}
          className="flex items-center gap-2 bg-[#F34A23] hover:bg-[#E04420] text-white px-6 py-3 rounded-full text-sm font-medium transition-colors shadow-lg shadow-[#F34A23]/20"
        >
          <Plus className="w-4 h-4" />
          <span>Create your first assessment</span>
        </motion.button>
      )}
    </motion.div>
  )
}
