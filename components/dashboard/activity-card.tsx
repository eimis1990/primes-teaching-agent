import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { ArrowRight } from 'lucide-react'

export type ActivityItem = {
  id: string
  title: string
  description: string
  time: string
  icon?: React.ReactNode
  onClick?: () => void
}

export type ActivityCardProps = {
  title: string
  description: string
  items: ActivityItem[]
  emptyMessage?: string
  className?: string
}

export function ActivityCard({
  title,
  description,
  items,
  emptyMessage = 'No activity yet',
  className
}: ActivityCardProps) {
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
      <CardContent>
        {items.length === 0 ? (
          <div className="text-white/40 text-sm text-center py-8">
            {emptyMessage}
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={item.onClick}
                className={cn(
                  "w-full flex items-start gap-3 p-3 rounded-lg transition-colors text-left",
                  item.onClick ? "hover:bg-white/5 cursor-pointer group" : "bg-white/[0.02]"
                )}
              >
                {item.icon && (
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    {item.icon}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-white text-sm font-medium truncate">
                      {item.title}
                    </p>
                    {item.onClick && (
                      <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-white/40 text-xs mt-0.5 truncate">
                    {item.description}
                  </p>
                  <p className="text-white/30 text-xs mt-1">
                    {item.time}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
