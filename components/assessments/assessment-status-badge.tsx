"use client"

import type { AssessmentStatus } from "@/lib/types/assessments"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface AssessmentStatusBadgeProps {
  status: AssessmentStatus
  className?: string
}

const statusConfig: Record<AssessmentStatus, { label: string; bgColor: string; textColor: string; borderColor: string }> = {
  draft: {
    label: "Draft",
    bgColor: "bg-white/10",
    textColor: "text-white/60",
    borderColor: "border-white/10",
  },
  sent: {
    label: "Pending",
    bgColor: "bg-amber-500/10",
    textColor: "text-amber-400",
    borderColor: "border-amber-500/20",
  },
  in_progress: {
    label: "Active",
    bgColor: "bg-emerald-500/10",
    textColor: "text-emerald-400",
    borderColor: "border-emerald-500/20",
  },
  completed: {
    label: "Completed",
    bgColor: "bg-blue-500/10",
    textColor: "text-blue-400",
    borderColor: "border-blue-500/20",
  },
  expired: {
    label: "Expired",
    bgColor: "bg-red-500/10",
    textColor: "text-red-400",
    borderColor: "border-red-500/20",
  },
}

export function AssessmentStatusBadge({ status, className = "" }: AssessmentStatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium border",
        config.bgColor,
        config.textColor,
        config.borderColor,
        className
      )}
    >
      {config.label}
    </Badge>
  )
}
