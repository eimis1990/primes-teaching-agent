import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { ArrowRight } from 'lucide-react'

export type QuickAction = {
  label: string
  description?: string
  icon?: React.ReactNode
  onClick: () => void
}

export type QuickActionsCardProps = {
  title?: string
  description?: string
  actions: QuickAction[]
  className?: string
}

export function QuickActionsCard({
  title = "Quick Actions",
  description = "Common tasks and shortcuts",
  actions,
  className
}: QuickActionsCardProps) {
  return (
    <Card className={cn('border-white/[0.08] bg-[#1B1C20]', className)}>
      <CardHeader>
        <CardTitle className="text-white text-lg font-semibold">
          {title}
        </CardTitle>
        <CardDescription className="text-white/40 text-sm">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] hover:bg-white/10 text-white text-sm transition-all group"
          >
            {action.icon && (
              <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                {action.icon}
              </div>
            )}
            <div className="flex-1 text-left min-w-0">
              <p className="font-medium">{action.label}</p>
              {action.description && (
                <p className="text-white/40 text-xs mt-0.5 truncate">
                  {action.description}
                </p>
              )}
            </div>
            <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-white/60 group-hover:translate-x-1 transition-all flex-shrink-0" />
          </button>
        ))}
      </CardContent>
    </Card>
  )
}
