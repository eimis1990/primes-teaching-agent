"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { motion } from "framer-motion"
import { ArrowLeft, Building2, Users, Mail, Settings, Plus, X, Check, Trash2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Organization {
  id: string
  name: string
  slug: string
  allowed_domains: string[]
  settings: any
  is_active: boolean
  created_at: string
  updated_at: string
  user_count: number
  admin_count: number
}

interface User {
  id: string
  email: string
  full_name: string | null
  role: 'admin' | 'employee'
  status: 'active' | 'pending' | 'suspended'
  position: string | null
  created_at: string
  last_login_at: string | null
}

interface Invite {
  id: string
  email: string
  role: 'admin' | 'employee'
  status: 'pending' | 'accepted' | 'expired' | 'cancelled'
  expires_at: string
  created_at: string
}

export default function OrganizationDetailsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    allowed_domains: [] as string[],
    is_active: true,
  })
  const [domainInput, setDomainInput] = useState("")
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)
  
  // Admin management state
  const [users, setUsers] = useState<User[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<'admin' | 'employee'>('admin')
  const [inviting, setInviting] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(false)

  // Fetch organization details
  useEffect(() => {
    if (user && params.id) {
      fetchOrganization()
      fetchUsers()
      fetchInvites()
    }
  }, [user, params.id])

  const fetchOrganization = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/organizations/${params.id}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch organization')
      }

      const data = await response.json()
      setOrganization(data)
      setFormData({
        name: data.name,
        slug: data.slug,
        allowed_domains: data.allowed_domains || [],
        is_active: data.is_active,
      })
    } catch (error) {
      console.error('Error fetching organization:', error)
      toast({
        title: "Error",
        description: "Failed to load organization details",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true)
      const response = await fetch(`/api/organizations/${params.id}/users`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }

      const data = await response.json()
      setUsers(data)
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoadingUsers(false)
    }
  }

  const fetchInvites = async () => {
    try {
      const response = await fetch(`/api/organizations/${params.id}/invites`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch invites')
      }

      const data = await response.json()
      setInvites(data.filter((invite: Invite) => invite.status === 'pending'))
    } catch (error) {
      console.error('Error fetching invites:', error)
    }
  }

  // Handle slug change
  const handleSlugChange = (slug: string) => {
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '')
    setFormData(prev => ({ ...prev, slug: cleanSlug }))
  }

  // Add domain
  const handleAddDomain = () => {
    const domain = domainInput.trim().toLowerCase()
    
    const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/
    if (!domainRegex.test(domain)) {
      toast({
        title: "Invalid domain",
        description: "Please enter a valid domain (e.g., example.com)",
        variant: "destructive",
      })
      return
    }

    if (formData.allowed_domains.includes(domain)) {
      toast({
        title: "Domain already added",
        description: "This domain is already in the allowed list",
        variant: "destructive",
      })
      return
    }

    setFormData(prev => ({
      ...prev,
      allowed_domains: [...prev.allowed_domains, domain]
    }))
    setDomainInput("")
  }

  // Remove domain
  const handleRemoveDomain = (domain: string) => {
    setFormData(prev => ({
      ...prev,
      allowed_domains: prev.allowed_domains.filter(d => d !== domain)
    }))
  }

  // Save changes
  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter an organization name",
        variant: "destructive",
      })
      return
    }

    if (!formData.slug.trim()) {
      toast({
        title: "Slug required",
        description: "Please enter a URL slug",
        variant: "destructive",
      })
      return
    }

    setSaving(true)

    try {
      const response = await fetch(`/api/organizations/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update organization')
      }

      toast({
        title: "Changes saved!",
        description: "Organization has been updated successfully",
      })

      // Refresh organization data
      fetchOrganization()
    } catch (error: any) {
      console.error('Error updating organization:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to update organization",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  // Delete organization
  const handleDelete = async () => {
    setDeleting(true)

    try {
      const response = await fetch(`/api/organizations/${params.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete organization')
      }

      toast({
        title: "Organization deleted",
        description: "The organization has been permanently deleted",
      })

      // Redirect to platform owner dashboard
      router.push('/platform-owner')
    } catch (error: any) {
      console.error('Error deleting organization:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete organization",
        variant: "destructive",
      })
      setDeleting(false)
    }
  }

  // Invite admin
  const handleInviteAdmin = async () => {
    if (!inviteEmail.trim()) {
      toast({
        title: "Email required",
        description: "Please enter an email address",
        variant: "destructive",
      })
      return
    }

    setInviting(true)

    try {
      const response = await fetch(`/api/organizations/${params.id}/invites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invite')
      }

      toast({
        title: "Invite sent!",
        description: `Invitation sent to ${inviteEmail}`,
      })

      setInviteEmail("")
      fetchInvites()
      fetchOrganization() // Refresh stats
    } catch (error: any) {
      console.error('Error inviting admin:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to send invite",
        variant: "destructive",
      })
    } finally {
      setInviting(false)
    }
  }

  // Cancel invite
  const handleCancelInvite = async (inviteId: string) => {
    try {
      const response = await fetch(`/api/invites/${inviteId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to cancel invite')
      }

      toast({
        title: "Invite cancelled",
        description: "The invitation has been cancelled",
      })

      fetchInvites()
    } catch (error: any) {
      console.error('Error cancelling invite:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to cancel invite",
        variant: "destructive",
      })
    }
  }

  // Change user role
  const handleChangeRole = async (userId: string, newRole: 'admin' | 'employee') => {
    try {
      const response = await fetch(`/api/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update role')
      }

      toast({
        title: "Role updated",
        description: `User role changed to ${newRole}`,
      })

      fetchUsers()
      fetchOrganization() // Refresh stats
    } catch (error: any) {
      console.error('Error changing role:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to update role",
        variant: "destructive",
      })
    }
  }

  if (authLoading || !user || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-white/60">Loading...</div>
      </div>
    )
  }

  if (!organization) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-white/60">Organization not found</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="pt-8 px-6 md:px-12 max-w-5xl mx-auto pb-12">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/platform-owner')}
            className="text-white/60 hover:text-white hover:bg-white/5 mb-4 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-[#F34A23] to-[#ff6b4a] rounded-xl flex items-center justify-center">
                <Building2 className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">{organization.name}</h1>
                <p className="text-white/40 mt-1">/{organization.slug}</p>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(true)}
              className="border-red-500/20 text-red-500 hover:bg-red-500/10"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        <div className="h-[1px] bg-white/10 w-full mb-8" />

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-white/5 bg-[#1B1C20]/90 backdrop-blur-xl">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/40 text-sm mb-1">Total Users</p>
                    <p className="text-3xl font-bold text-white">{organization.user_count}</p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card className="border-white/5 bg-[#1B1C20]/90 backdrop-blur-xl">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/40 text-sm mb-1">Admins</p>
                    <p className="text-3xl font-bold text-white">{organization.admin_count}</p>
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Card className="border-white/5 bg-[#1B1C20]/90 backdrop-blur-xl">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/40 text-sm mb-1">Status</p>
                    <p className="text-2xl font-bold text-white">
                      {organization.is_active ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    organization.is_active 
                      ? 'bg-gradient-to-br from-green-500 to-emerald-500' 
                      : 'bg-white/10'
                  }`}>
                    <Settings className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Settings Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card className="border-white/5 bg-[#1B1C20]/90 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-white">Organization Settings</CardTitle>
              <CardDescription className="text-white/40">
                Update organization details and configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Organization Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white text-sm font-medium">
                  Organization Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#F34A23] focus:ring-[#F34A23]"
                />
              </div>

              {/* Slug */}
              <div className="space-y-2">
                <Label htmlFor="slug" className="text-white text-sm font-medium">
                  URL Slug
                </Label>
                <Input
                  id="slug"
                  type="text"
                  value={formData.slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#F34A23] focus:ring-[#F34A23]"
                />
              </div>

              {/* Allowed Domains */}
              <div className="space-y-2">
                <Label htmlFor="domain" className="text-white text-sm font-medium">
                  Allowed Email Domains
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="domain"
                    type="text"
                    placeholder="example.com"
                    value={domainInput}
                    onChange={(e) => setDomainInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddDomain()
                      }
                    }}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#F34A23] focus:ring-[#F34A23]"
                  />
                  <Button
                    type="button"
                    onClick={handleAddDomain}
                    variant="outline"
                    className="border-white/10 text-white hover:bg-white/5"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {/* Domain List */}
                {formData.allowed_domains.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {formData.allowed_domains.map((domain) => (
                        <div
                          key={domain}
                          className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white"
                        >
                          <Check className="w-3 h-3 text-green-500" />
                          <span>{domain}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveDomain(domain)}
                            className="ml-1 text-white/40 hover:text-white/80 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Save Button */}
              <div className="flex items-center justify-end gap-4 pt-4">
                <Button
                  onClick={handleSave}
                  className="bg-gradient-to-r from-[#F34A23] to-[#ff6b4a] hover:from-[#E04420] hover:to-[#F34A23] text-white"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Admin Management Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className="mt-6"
        >
          <Card className="border-white/5 bg-[#1B1C20]/90 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-white">Invite Admin</CardTitle>
              <CardDescription className="text-white/40">
                Send an invitation to add an admin to this organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    type="email"
                    placeholder="admin@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleInviteAdmin()
                      }
                    }}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-[#F34A23] focus:ring-[#F34A23]"
                  />
                </div>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'admin' | 'employee')}
                  className="bg-white/5 border border-white/10 text-white rounded-lg px-4 py-2 focus:border-[#F34A23] focus:ring-[#F34A23]"
                >
                  <option value="admin">Admin</option>
                  <option value="employee">Employee</option>
                </select>
                <Button
                  onClick={handleInviteAdmin}
                  disabled={inviting}
                  className="bg-gradient-to-r from-[#F34A23] to-[#ff6b4a] hover:from-[#E04420] hover:to-[#F34A23] text-white"
                >
                  {inviting ? 'Sending...' : 'Send Invite'}
                </Button>
              </div>

              {/* Pending Invites */}
              {invites.length > 0 && (
                <div className="mt-6 pt-6 border-t border-white/10">
                  <h3 className="text-white font-medium mb-4">Pending Invites ({invites.length})</h3>
                  <div className="space-y-2">
                    {invites.map((invite) => (
                      <div
                        key={invite.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                            <Mail className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-white font-medium">{invite.email}</p>
                            <p className="text-white/40 text-sm">
                              {invite.role} • Expires {new Date(invite.expires_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancelInvite(invite.id)}
                          className="border-red-500/20 text-red-500 hover:bg-red-500/10"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Users & Admins List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
          className="mt-6"
        >
          <Card className="border-white/5 bg-[#1B1C20]/90 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-white">Users & Admins</CardTitle>
              <CardDescription className="text-white/40">
                Manage users and administrators in this organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingUsers ? (
                <div className="text-center py-8 text-white/60">Loading users...</div>
              ) : users.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-white/20 mx-auto mb-3" />
                  <p className="text-white/60">No users yet</p>
                  <p className="text-white/40 text-sm">Invite admins to get started</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          user.role === 'admin'
                            ? 'bg-gradient-to-br from-purple-500 to-pink-500'
                            : 'bg-gradient-to-br from-blue-500 to-cyan-500'
                        }`}>
                          {user.role === 'admin' ? (
                            <Mail className="w-5 h-5 text-white" />
                          ) : (
                            <Users className="w-5 h-5 text-white" />
                          )}
                        </div>
                        <div>
                          <p className="text-white font-medium">
                            {user.full_name || user.email}
                          </p>
                          <p className="text-white/40 text-sm">
                            {user.email} • {user.role}
                            {user.position && ` • ${user.position}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          user.status === 'active'
                            ? 'bg-green-500/20 text-green-500'
                            : user.status === 'pending'
                            ? 'bg-yellow-500/20 text-yellow-500'
                            : 'bg-red-500/20 text-red-500'
                        }`}>
                          {user.status}
                        </span>
                        {user.role === 'admin' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleChangeRole(user.id, 'employee')}
                            className="border-white/10 text-white/60 hover:bg-white/5 text-xs"
                          >
                            Demote to Employee
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleChangeRole(user.id, 'admin')}
                            className="border-white/10 text-white hover:bg-white/5 text-xs"
                          >
                            Promote to Admin
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-[#1B1C20] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Organization</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Are you sure you want to delete <span className="font-semibold text-white">{organization.name}</span>?
              This action cannot be undone and will permanently delete all data associated with this organization,
              including users, assessments, and documents.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 text-white hover:bg-white/5">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {deleting ? 'Deleting...' : 'Delete Organization'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
