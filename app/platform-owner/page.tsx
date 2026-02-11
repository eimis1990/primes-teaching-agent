"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { motion } from "framer-motion"
import { Building2, Users, Plus, Settings, ArrowRight, Mail, Shield } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatCard } from "@/components/dashboard/stat-card"
import { QuickActionsCard } from "@/components/dashboard/quick-actions-card"
import { PageContainer } from "@/components/ui/page-container"

export default function PlatformOwnerPage() {
  const { user, loading: authLoading, signOut } = useAuth()
  const router = useRouter()
  const [organizations, setOrganizations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalOrganizations: 0,
    totalUsers: 0,
    activeAdmins: 0,
  })

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [authLoading, user, router])

  // Check if user is platform owner
  useEffect(() => {
    const platformOwnerEmail = process.env.NEXT_PUBLIC_PLATFORM_OWNER_EMAIL?.toLowerCase()
    if (user && user.email?.toLowerCase() !== platformOwnerEmail) {
      router.push('/dashboard')
    }
  }, [user, router])

  // Fetch organizations
  useEffect(() => {
    if (user) {
      fetchOrganizations()
    }
  }, [user])

  const fetchOrganizations = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/organizations')
      
      if (!response.ok) {
        throw new Error('Failed to fetch organizations')
      }

      const data = await response.json()
      setOrganizations(data)

      // Calculate stats
      const totalUsers = data.reduce((sum: number, org: any) => sum + (org.user_count || 0), 0)
      const totalAdmins = data.reduce((sum: number, org: any) => sum + (org.admin_count || 0), 0)

      setStats({
        totalOrganizations: data.length,
        totalUsers,
        activeAdmins: totalAdmins,
      })
    } catch (error) {
      console.error('Error fetching organizations:', error)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || !user || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-white/60">Loading...</div>
      </div>
    )
  }

  const statCardsData = [
    {
      title: "Total Organizations",
      value: stats.totalOrganizations.toString(),
      changePercentage: "+0%",
      icon: <Building2 className="w-5 h-5" />,
    },
    {
      title: "Total Users",
      value: stats.totalUsers.toString(),
      changePercentage: "+0%",
      icon: <Users className="w-5 h-5" />,
    },
    {
      title: "Active Admins",
      value: stats.activeAdmins.toString(),
      changePercentage: "+0%",
      icon: <Shield className="w-5 h-5" />,
    },
  ]

  const platformActions = [
    {
      label: "Create New Organization",
      description: "Add a new organization to the platform",
      icon: <Plus className="w-4 h-4" />,
      onClick: () => router.push('/platform-owner/organizations/new')
    },
    {
      label: "Platform Settings",
      description: "Configure platform-wide settings",
      icon: <Settings className="w-4 h-4" />,
      onClick: () => router.push('/platform-owner/settings')
    }
  ]

  return (
    <div className="min-h-screen bg-background">
      <div className="pt-8 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Platform Owner Panel</h1>
            <p className="text-white/40 mt-2">Manage organizations and platform settings</p>
          </div>
          <Button 
            onClick={() => router.push('/platform-owner/organizations/new')}
            className="bg-gradient-to-r from-[#F34A23] to-[#ff6b4a] hover:from-[#E04420] hover:to-[#F34A23] text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Organization
          </Button>
        </div>

        <div className="h-[1px] bg-white/10 w-full mb-8" />

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {statCardsData.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <StatCard
                icon={stat.icon}
                value={stat.value}
                title={stat.title}
                changePercentage={stat.changePercentage}
                changeLabel="this month"
              />
            </motion.div>
          ))}
        </div>

        {/* Organizations List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <Card className="border-white/5 bg-[#1B1C20]/90 backdrop-blur-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white text-xl">Organizations</CardTitle>
                  <CardDescription className="text-white/40 mt-1">
                    Manage all organizations on the platform
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {organizations.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Building2 className="w-8 h-8 text-white/40" />
                  </div>
                  <h3 className="text-white font-medium mb-2">No organizations yet</h3>
                  <p className="text-white/40 text-sm mb-6">
                    Create your first organization to get started
                  </p>
                  <Button
                    onClick={() => router.push('/platform-owner/organizations/new')}
                    className="bg-gradient-to-r from-[#F34A23] to-[#ff6b4a] hover:from-[#E04420] hover:to-[#F34A23] text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Organization
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {organizations.map((org: any) => (
                    <div
                      key={org.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group"
                      onClick={() => router.push(`/platform-owner/organizations/${org.id}`)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-[#F34A23] to-[#ff6b4a] rounded-lg flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h4 className="text-white font-medium">{org.name}</h4>
                          <p className="text-white/40 text-sm">{org.slug}</p>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-white/40 group-hover:text-white/60 group-hover:translate-x-1 transition-all" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
          className="mt-6"
        >
          <QuickActionsCard
            title="Quick Actions"
            description="Platform management shortcuts"
            actions={platformActions}
          />
        </motion.div>
      </div>
    </div>
  )
}
