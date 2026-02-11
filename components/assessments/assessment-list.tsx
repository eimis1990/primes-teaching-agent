"use client"

import { useRouter } from "next/navigation"
import { MoreHorizontal, Eye, Send, Trash2, BarChart2 } from "lucide-react"
import { motion } from "framer-motion"
import { AssessmentStatusBadge } from "./assessment-status-badge"
import type { Assessment } from "@/lib/types/assessments"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface AssessmentListProps {
  assessments: Assessment[]
  onRefresh: () => void
}

export function AssessmentList({ assessments, onRefresh }: AssessmentListProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="overflow-hidden"
    >
      <Card className="border-white/[0.08] bg-[#1B1C20]/95 py-0 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.7)]">
        <CardContent className="px-0">
          <Table className="min-w-[920px]">
            <TableHeader>
              <TableRow className="border-white/[0.08] hover:bg-transparent">
                <TableHead className="px-6 py-4 text-white/45 text-xs font-semibold uppercase tracking-wider">Assessment Name</TableHead>
                <TableHead className="px-3 py-4 text-white/45 text-xs font-semibold uppercase tracking-wider">Type</TableHead>
                <TableHead className="px-3 py-4 text-white/45 text-xs font-semibold uppercase tracking-wider">Created Date</TableHead>
                <TableHead className="px-3 py-4 text-white/45 text-xs font-semibold uppercase tracking-wider">Employee</TableHead>
                <TableHead className="px-3 py-4 text-white/45 text-xs font-semibold uppercase tracking-wider">Status</TableHead>
                <TableHead className="px-6 py-4 text-right text-white/45 text-xs font-semibold uppercase tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assessments.map((assessment, index) => (
                <AssessmentRow
                  key={assessment.id}
                  assessment={assessment}
                  onRefresh={onRefresh}
                  index={index}
                />
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="border-t border-white/[0.08] px-6 py-4 justify-between">
          <span className="text-white/45 text-sm">
            Showing <span className="text-white">{assessments.length}</span> assessments
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 border-white/10 bg-transparent text-white/70 hover:bg-white/[0.04] hover:text-white">
              Previous
            </Button>
            <Button variant="outline" size="sm" className="h-8 border-white/10 bg-transparent text-white/70 hover:bg-white/[0.04] hover:text-white">
              Next
            </Button>
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  )
}

function AssessmentRow({
  assessment,
  onRefresh,
  index,
}: {
  assessment: Assessment
  onRefresh: () => void
  index: number
}) {
  const router = useRouter()

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const handleSend = async () => {
    if (assessment.status !== "draft") return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("assessments")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", assessment.id)

      if (error) throw error

      toast.success("Assessment sent to employee")
      onRefresh()
    } catch (error) {
      console.error("Error sending assessment:", error)
      toast.error("Failed to send assessment")
    }
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this assessment?")) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("assessments")
        .delete()
        .eq("id", assessment.id)

      if (error) throw error

      toast.success("Assessment deleted")
      onRefresh()
    } catch (error) {
      console.error("Error deleting assessment:", error)
      toast.error("Failed to delete assessment")
    }
  }

  return (
    <motion.tr
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.3, 
        delay: index * 0.05,
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      className="border-white/[0.04] hover:bg-white/[0.02] transition-all duration-200 cursor-pointer group"
      onClick={() => router.push(`/assessments/${assessment.id}`)}
    >
      {/* Assessment Name */}
      <TableCell className="px-6 py-4">
        <div className="flex items-center gap-3">
        <div
          className="w-2 h-2 rounded-full transition-transform duration-200 group-hover:scale-125"
          style={{
            backgroundColor:
              assessment.status === "in_progress"
                ? "#10B981"
                : assessment.status === "sent"
                ? "#F59E0B"
                : assessment.status === "completed"
                ? "#3B82F6"
                : "#6B7280",
          }}
        />
        <div>
          <p className="text-white text-sm font-medium transition-colors group-hover:text-white/90">{assessment.title}</p>
          {assessment.assessment_type && (
            <p className="text-white/40 text-xs transition-colors group-hover:text-white/50">{assessment.assessment_type.name}</p>
          )}
        </div>
        </div>
      </TableCell>

      {/* Type */}
      <TableCell className="px-3 py-4">
        <div className="flex items-center">
        {assessment.assessment_type ? (
          <span
            className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border"
            style={{
              backgroundColor: `${assessment.assessment_type.color}1A`,
              color: assessment.assessment_type.color,
              borderColor: `${assessment.assessment_type.color}33`,
            }}
          >
            {assessment.assessment_type.name}
          </span>
        ) : (
          <span className="text-white/40 text-sm">—</span>
        )}
        </div>
      </TableCell>

      {/* Created Date */}
      <TableCell className="px-3 py-4">
        <div className="flex items-center">
        <span className="text-white/60 text-sm">{formatDate(assessment.created_at)}</span>
        </div>
      </TableCell>

      {/* Employee */}
      <TableCell className="px-3 py-4">
        <div className="flex items-center gap-2 min-w-0">
        {assessment.employee ? (
          <>
            <Avatar className="size-8 border border-white/15">
              {assessment.employee.avatar_url ? (
                <AvatarImage src={assessment.employee.avatar_url} alt={assessment.employee.full_name} />
              ) : null}
              <AvatarFallback className="bg-[#F34A23] text-white text-xs font-medium">
                {assessment.employee.full_name[0]}
              </AvatarFallback>
            </Avatar>
            <span className="text-white text-sm truncate">{assessment.employee.full_name}</span>
          </>
        ) : (
          <span className="text-white/40 text-sm">—</span>
        )}
        </div>
      </TableCell>

      {/* Status */}
      <TableCell className="px-3 py-4">
        <div className="flex items-center">
        <AssessmentStatusBadge status={assessment.status} />
        </div>
      </TableCell>

      {/* Actions */}
      <TableCell className="px-6 py-4 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="size-8 text-white/45 hover:text-white hover:bg-white/[0.06]">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-44 border-white/10 bg-[#252525] text-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenuItem
              onClick={() => router.push(`/assessments/${assessment.id}`)}
              className="text-white/85 focus:bg-white/10 focus:text-white"
            >
              <Eye className="w-4 h-4" />
              View Details
            </DropdownMenuItem>
            {assessment.status === "draft" && (
              <DropdownMenuItem onClick={handleSend} className="text-emerald-400 focus:bg-emerald-500/10 focus:text-emerald-300">
                <Send className="w-4 h-4" />
                Send to Employee
              </DropdownMenuItem>
            )}
            {(assessment.status === "completed" || assessment.status === "in_progress") && (
              <DropdownMenuItem
                onClick={() => router.push(`/assessments/${assessment.id}/results`)}
                className="text-blue-400 focus:bg-blue-500/10 focus:text-blue-300"
              >
                <BarChart2 className="w-4 h-4" />
                View Results
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={handleDelete} className="text-red-400 focus:bg-red-500/10 focus:text-red-300">
              <Trash2 className="w-4 h-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </motion.tr>
  )
}
