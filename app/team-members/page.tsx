"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { SidebarLayout } from "@/components/layouts/sidebar-layout"
import { useAuth } from "@/contexts/auth-context"
import { InviteDialog } from "@/components/team/invite-dialog"
import { motion } from "framer-motion"
import { Search, Plus, Users, Mail, MoreVertical, Trash2, Clock, XCircle, RotateCcw, Shield, Edit2 } from "lucide-react"
import { toast, Toaster } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PageHeader } from "@/components/dashboard/page-header"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface TeamMember {
  id: string
  email: string
  full_name: string
  position?: string
  avatar_url?: string
  is_active: boolean
  status: 'active' | 'pending' | 'suspended'
  role: 'admin' | 'employee'
  last_login_at?: string
}

interface Invite {
  id: string
  email: string
  role: 'admin' | 'employee'
  status: 'pending' | 'accepted' | 'expired' | 'cancelled'
  expires_at: string
  created_at: string
  invited_by_user?: {
    full_name: string
    email: string
  }
}

export default function TeamMembersPage() {
  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [activeTab, setActiveTab] = useState("members")
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
  const [editPosition, setEditPosition] = useState("")
  const [editRole, setEditRole] = useState<"admin" | "employee">("employee")
  const [savingEdit, setSavingEdit] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [authLoading, user, router])

  useEffect(() => {
    if (user && profile) {
      if (profile.role !== 'admin') {
        toast.error("Only administrators can access employee management")
        router.push('/dashboard')
        return
      }
      loadData()
    }
  }, [user, profile])

  const loadData = async () => {
    await Promise.all([loadMembers(), loadInvites()])
  }

  const loadMembers = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/employees")
      const result = await response.json()

      if (response.ok) {
        setMembers(result.data || [])
      } else {
        console.error("Error loading employees:", result.error)
        toast.error("Failed to load employees")
      }
    } catch (error) {
      console.error("Error loading employees:", error)
      toast.error("Failed to load employees")
    } finally {
      setLoading(false)
    }
  }

  const loadInvites = async () => {
    try {
      const response = await fetch("/api/invites?status=pending")
      const result = await response.json()

      if (response.ok) {
        setInvites(result.data || [])
      }
    } catch (error) {
      console.error("Error loading invites:", error)
    }
  }

  const handleDeleteMember = async (id: string) => {
    if (!confirm("Are you sure you want to remove this employee?")) {
      return
    }

    try {
      const response = await fetch(`/api/employees/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast.success("Employee removed successfully")
        loadMembers()
      } else {
        toast.error("Failed to remove employee")
      }
    } catch (error) {
      console.error("Error deleting employee:", error)
      toast.error("Failed to remove employee")
    }
  }

  const handleCancelInvite = async (id: string) => {
    try {
      const response = await fetch(`/api/invites/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast.success("Invite cancelled")
        loadInvites()
      } else {
        toast.error("Failed to cancel invite")
      }
    } catch (error) {
      console.error("Error cancelling invite:", error)
      toast.error("Failed to cancel invite")
    }
  }

  const handleResendInvite = async (id: string) => {
    try {
      const response = await fetch(`/api/invites/${id}`, {
        method: "PUT",
      })

      const result = await response.json()

      if (response.ok) {
        toast.success("Invite resent successfully")
        loadInvites()
      } else {
        toast.error(result.error || "Failed to resend invite")
      }
    } catch (error) {
      console.error("Error resending invite:", error)
      toast.error("Failed to resend invite")
    }
  }

  const openEditMember = (member: TeamMember) => {
    setEditingMember(member)
    setEditPosition(member.position || "")
    setEditRole(member.role)
  }

  const handleSaveMember = async () => {
    if (!editingMember) return
    setSavingEdit(true)

    try {
      const response = await fetch(`/api/employees/${editingMember.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          position: editPosition,
          role: editRole,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || "Failed to update employee")
        return
      }

      toast.success("Employee updated successfully")
      setEditingMember(null)
      await loadMembers()
    } catch (error) {
      console.error("Error updating employee:", error)
      toast.error("Failed to update employee")
    } finally {
      setSavingEdit(false)
    }
  }

  const filteredMembers = members.filter((member) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      member.full_name.toLowerCase().includes(query) ||
      member.email.toLowerCase().includes(query) ||
      member.position?.toLowerCase().includes(query)
    )
  })

  const filteredInvites = invites.filter((invite) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return invite.email.toLowerCase().includes(query)
  })

  if (authLoading || !user || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-white/60">Loading...</div>
      </div>
    )
  }

  const pendingCount = invites.filter(i => i.status === 'pending').length

  return (
    <SidebarLayout breadcrumbs={[{ label: "Employees" }]}>
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: "#1B1C20",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            color: "#fff",
            borderRadius: "12px",
          },
        }}
      />

      <div>
        <PageHeader
          title="Employees"
          description="Manage your organization's employees"
          actions={
            <Button
              size="sm"
              onClick={() => setShowInviteDialog(true)}
              className="bg-[#F34A23] hover:bg-[#E04420]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Invite Employee
            </Button>
          }
        />

        <div className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <Card className="border-white/[0.08] bg-[#1B1C20]/95 py-0 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.7)]">
              <CardContent className="px-4 py-4">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="relative flex-1 max-w-full lg:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <Input
                      type="text"
                      placeholder="Search employees or invites..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-10 rounded-lg border-white/10 bg-[#181A1F] pl-10 pr-4 text-white placeholder:text-white/35 focus-visible:border-white/25 focus-visible:ring-white/10"
                    />
                  </div>

                  <TabsList className="h-auto w-full lg:w-auto lg:ml-auto bg-[#181A1F] border border-white/10 p-1 flex flex-wrap">
                    <TabsTrigger value="members" className="text-white/70 data-[state=active]:bg-[#2A2B30] data-[state=active]:text-white">
                      Active Employees ({members.length})
                    </TabsTrigger>
                    <TabsTrigger value="invites" className="text-white/70 data-[state=active]:bg-[#2A2B30] data-[state=active]:text-white">
                      Pending Invites
                      {pendingCount > 0 && (
                        <Badge variant="secondary" className="ml-2 bg-[#F34A23] text-white">
                          {pendingCount}
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>
                </div>
              </CardContent>
            </Card>

            <TabsContent value="members" className="mt-3">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="text-white/60">Loading employees...</div>
                </div>
              ) : filteredMembers.length === 0 ? (
                <EmptyState 
                  hasMembers={members.length > 0} 
                  onInvite={() => setShowInviteDialog(true)} 
                  type="members"
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{
                      duration: 0.35,
                      ease: [0.25, 0.46, 0.45, 0.94],
                    }}
                  >
                    <AddEmployeeCard onClick={() => setShowInviteDialog(true)} />
                  </motion.div>
                  {filteredMembers.map((member, idx) => (
                    <motion.div
                      key={member.id}
                      initial={{ opacity: 0, scale: 0.9, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{
                        duration: 0.4,
                        delay: (idx + 1) * 0.08,
                        ease: [0.25, 0.46, 0.45, 0.94],
                      }}
                    >
                      <MemberCard 
                        member={member} 
                        onEdit={() => openEditMember(member)}
                        onDelete={() => handleDeleteMember(member.id)}
                        canDelete={member.role === "employee"}
                      />
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="invites" className="mt-3">
              {filteredInvites.length === 0 ? (
                <EmptyState 
                  hasMembers={invites.length > 0} 
                  onInvite={() => setShowInviteDialog(true)} 
                  type="invites"
                />
              ) : (
                <div className="space-y-3">
                  {filteredInvites.map((invite, idx) => (
                    <motion.div
                      key={invite.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: idx * 0.05 }}
                    >
                      <InviteCard
                        invite={invite}
                        onCancel={() => handleCancelInvite(invite.id)}
                        onResend={() => handleResendInvite(invite.id)}
                      />
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <InviteDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        onSuccess={() => {
          loadInvites()
          if (activeTab === 'members') {
            setActiveTab('invites')
          }
        }}
      />

      <EditEmployeeDialog
        open={!!editingMember}
        member={editingMember}
        position={editPosition}
        role={editRole}
        saving={savingEdit}
        onPositionChange={setEditPosition}
        onRoleChange={setEditRole}
        onOpenChange={(open) => {
          if (!open) setEditingMember(null)
        }}
        onSave={handleSaveMember}
      />
    </SidebarLayout>
  )
}

function MemberCard({
  member,
  onEdit,
  onDelete,
  canDelete,
}: {
  member: TeamMember
  onEdit: () => void
  onDelete: () => void
  canDelete: boolean
}) {
  const statusBadgeClass =
    member.status === "active"
      ? "bg-green-500/10 text-green-400 border-green-500/20"
      : member.status === "pending"
      ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
      : "bg-red-500/10 text-red-400 border-red-500/20"

  const roleBadgeClass =
    member.role === "admin"
      ? "bg-[#F34A23]/15 text-[#F34A23] border-[#F34A23]/25"
      : "bg-blue-500/10 text-blue-400 border-blue-500/20"

  return (
    <Card className="bg-[#1B1C20] border-white/[0.08] py-0 hover:border-white/15 transition-all duration-200 shadow-[0_10px_26px_-18px_rgba(0,0,0,0.8)]">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={statusBadgeClass}>
              <span
                className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${
                  member.status === "active"
                    ? "bg-green-400"
                    : member.status === "pending"
                    ? "bg-yellow-400"
                    : "bg-red-400"
                }`}
              />
              {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
            </Badge>
            <Badge variant="outline" className={roleBadgeClass}>
              {member.role === "admin" && <Shield className="w-3 h-3 mr-1" />}
              {member.role === "admin" ? "Admin" : "Employee"}
            </Badge>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8 -mt-1 -mr-1 text-white/45 hover:text-white hover:bg-white/[0.06]">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 border-white/10 bg-[#252525] text-white shadow-xl">
              <DropdownMenuItem onClick={onEdit} className="text-white/85 focus:bg-white/10 focus:text-white">
                <Edit2 className="w-4 h-4" />
                Edit
              </DropdownMenuItem>
              {canDelete && (
              <DropdownMenuItem onClick={onDelete} className="text-red-400 focus:bg-red-500/10 focus:text-red-300">
                <Trash2 className="w-4 h-4" />
                Remove
              </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex flex-col items-center text-center">
          <Avatar className="size-16 border-2 border-white/15 shadow-md">
            {member.avatar_url ? (
              <AvatarImage src={member.avatar_url} alt={member.full_name} className="object-cover" />
            ) : null}
            <AvatarFallback className="bg-[#F34A23]/15 text-[#F34A23] font-semibold text-xl">
              {member.full_name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <h3 className="mt-3 text-white font-semibold">{member.full_name}</h3>
          <p className="mt-1 text-sm text-white/45 min-h-[20px]">
            {member.position?.trim() ? member.position : "-"}
          </p>

          <div className="mt-4 w-full space-y-2 text-center">
            <div className="flex items-center justify-center gap-2 text-white/60 text-sm">
              <Mail className="w-4 h-4" />
              <span className="truncate max-w-[220px]">{member.email}</span>
            </div>
            {member.last_login_at && (
              <p className="text-xs text-white/40 pt-2 border-t border-white/10">
                Last login: {new Date(member.last_login_at).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function EditEmployeeDialog({
  open,
  member,
  position,
  role,
  saving,
  onPositionChange,
  onRoleChange,
  onOpenChange,
  onSave,
}: {
  open: boolean
  member: TeamMember | null
  position: string
  role: "admin" | "employee"
  saving: boolean
  onPositionChange: (value: string) => void
  onRoleChange: (value: "admin" | "employee") => void
  onOpenChange: (open: boolean) => void
  onSave: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-[#1B1C20] border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white">Edit Employee</DialogTitle>
          <DialogDescription className="text-white/60">
            Update position and role only. Name and email cannot be changed.
          </DialogDescription>
        </DialogHeader>

        {member && (
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-white/70">Name</Label>
              <Input value={member.full_name} disabled className="bg-[#121214] border-white/10 text-white/70" />
            </div>

            <div className="space-y-1">
              <Label className="text-white/70">Email</Label>
              <Input value={member.email} disabled className="bg-[#121214] border-white/10 text-white/70" />
            </div>

            <div className="space-y-1">
              <Label htmlFor="employee-position" className="text-white/70">Position title</Label>
              <Input
                id="employee-position"
                value={position}
                onChange={(e) => onPositionChange(e.target.value)}
                placeholder="e.g. iOS Developer, Senior .NET Engineer"
                className="bg-[#121214] border-white/10 text-white placeholder:text-white/30"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="employee-role" className="text-white/70">Role</Label>
              <Select value={role} onValueChange={(value: "admin" | "employee") => onRoleChange(value)}>
                <SelectTrigger id="employee-role" className="bg-[#121214] border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1B1C20] border-white/10">
                  <SelectItem value="employee" className="text-white focus:bg-white/10 focus:text-white">Employee</SelectItem>
                  <SelectItem value="admin" className="text-white focus:bg-white/10 focus:text-white">Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="bg-transparent border-white/10 text-white hover:bg-white/5"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onSave}
            disabled={saving || !member}
            className="bg-[#F34A23] hover:bg-[#E04420] text-white"
          >
            {saving ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function InviteCard({ invite, onCancel, onResend }: { invite: Invite; onCancel: () => void; onResend: () => void }) {
  const isExpired = new Date(invite.expires_at) < new Date()
  
  return (
    <Card className="bg-[#1B1C20] border-white/[0.08] py-0 hover:border-white/15 transition-all duration-200 shadow-[0_10px_26px_-18px_rgba(0,0,0,0.8)]">
      <CardContent className="p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="w-12 h-12 rounded-full bg-yellow-500/12 border border-yellow-500/25 flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5 text-yellow-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-white font-medium truncate">{invite.email}</h4>
              {invite.role === 'admin' && (
                <Badge variant="secondary" className="bg-[#F34A23]/10 text-[#F34A23] text-xs border border-[#F34A23]/25">
                  Admin
                </Badge>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <Badge
                variant="outline"
                className={isExpired ? "border-red-500/25 bg-red-500/10 text-red-400" : "border-yellow-500/25 bg-yellow-500/10 text-yellow-400"}
              >
                {isExpired ? 'Expired' : 'Pending'}
              </Badge>
              <p className="text-white/40 text-sm">
                {isExpired ? `Expired ${new Date(invite.expires_at).toLocaleDateString()}` : `Expires ${new Date(invite.expires_at).toLocaleDateString()}`}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onResend}
            className="size-8 hover:bg-white/[0.06] text-white/60 hover:text-white"
            title="Resend invite"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onCancel}
            className="size-8 hover:bg-red-500/10 text-white/60 hover:text-red-400"
            title="Cancel invite"
          >
            <XCircle className="w-4 h-4" />
          </Button>
        </div>
      </div>
      </CardContent>
    </Card>
  )
}

function EmptyState({ hasMembers, onInvite, type }: { hasMembers: boolean; onInvite: () => void; type: 'members' | 'invites' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-24 h-24 bg-[#35383D] rounded-2xl flex items-center justify-center mb-6">
        {type === 'members' ? <Users className="w-12 h-12 text-white/40" /> : <Mail className="w-12 h-12 text-white/40" />}
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">
        {hasMembers 
          ? `No ${type} match your search` 
          : type === 'members' 
          ? "No employees yet" 
          : "No pending invites"}
      </h3>
      <p className="text-white/40 text-center max-w-md mb-6">
        {hasMembers
          ? "Try adjusting your search criteria to find what you're looking for."
          : type === 'members'
          ? "Invite your first employee to get started."
          : "Send invites to add employees to your organization."}
      </p>
      {!hasMembers && (
        <Button
          onClick={onInvite}
          className="bg-[#F34A23] hover:bg-[#E04420] text-white"
        >
          <Plus className="w-4 h-4" />
          <span>Invite Employee</span>
        </Button>
      )}
    </div>
  )
}

function AddEmployeeCard({ onClick }: { onClick: () => void }) {
  return (
    <Card
      className="bg-[#1B1C20] border border-dashed border-white/20 py-0 hover:border-[#F34A23]/45 transition-all duration-200 cursor-pointer shadow-[0_10px_26px_-18px_rgba(0,0,0,0.8)]"
      onClick={onClick}
    >
      <CardContent className="p-5 h-full min-h-[220px] flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-full bg-[#F34A23]/12 border border-[#F34A23]/35 flex items-center justify-center">
          <Plus className="w-8 h-8 text-[#F34A23]" />
        </div>
        <h3 className="mt-4 text-white font-semibold">Add new employee</h3>
        <p className="mt-1 text-sm text-white/45 max-w-[200px]">
          Invite a teammate to join your organization.
        </p>
        <Button className="mt-4 bg-[#F34A23] hover:bg-[#E04420] text-white">Invite Employee</Button>
      </CardContent>
    </Card>
  )
}
