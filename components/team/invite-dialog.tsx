"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Mail, UserCog } from "lucide-react"

interface InviteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function InviteDialog({ open, onOpenChange, onSuccess }: InviteDialogProps) {
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"admin" | "employee">("employee")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role })
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(true)
        setEmail("")
        setRole("employee")
        
        // Call onSuccess callback after a short delay
        setTimeout(() => {
          onSuccess?.()
          onOpenChange(false)
          setSuccess(false)
        }, 1500)
      } else {
        setError(data.error || 'Failed to send invite')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-[#1B1C20] border-white/10">
        <DialogHeader>
          <DialogTitle className="text-white text-xl">Invite Employee</DialogTitle>
          <DialogDescription className="text-white/60">
            Send an invitation to join your organization
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6 py-4">
            {error && (
              <Alert className="bg-red-500/10 border-red-500/20 text-red-400">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="ml-2">{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="bg-green-500/10 border-green-500/20 text-green-400">
                <Mail className="h-4 w-4" />
                <AlertDescription className="ml-2">
                  Invite sent successfully!
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/70">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <Input
                  id="email"
                  type="email"
                  placeholder="colleague@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading || success}
                  className="pl-10 bg-[#121214] border-white/10 text-white placeholder:text-white/30 focus-visible:ring-[#F34A23]"
                />
              </div>
              <p className="text-xs text-white/40">
                They'll sign in with Google using this email
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role" className="text-white/70">
                Role
              </Label>
              <Select value={role} onValueChange={(value: "admin" | "employee") => setRole(value)} disabled={loading || success}>
                <SelectTrigger id="role" className="bg-[#121214] border-white/10 text-white focus:ring-[#F34A23]">
                  <div className="flex items-center gap-2">
                    <UserCog className="w-4 h-4 text-white/40" />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-[#1B1C20] border-white/10">
                  <SelectItem value="employee" className="text-white focus:bg-white/10 focus:text-white">
                    Employee
                  </SelectItem>
                  <SelectItem value="admin" className="text-white focus:bg-white/10 focus:text-white">
                    Administrator
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-white/40">
                {role === 'admin'
                  ? 'Can manage employees and create assessments'
                  : 'Can take assessments and view their progress'}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading || success}
              className="bg-transparent border-white/10 text-white hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || success}
              className="bg-gradient-to-r from-[#F34A23] to-[#ff6b4a] hover:from-[#E04420] hover:to-[#F34A23] text-white"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : success ? (
                'Sent!'
              ) : (
                'Send Invite'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
