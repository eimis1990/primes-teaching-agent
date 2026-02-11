import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

export type PageHeaderProps = {
  title: string
  description?: string
  badge?: ReactNode
  actions?: ReactNode
  backButton?: {
    label?: string
    href: string
  }
  className?: string
}

export function PageHeader({
  title,
  description,
  badge,
  actions,
  backButton,
  className
}: PageHeaderProps) {
  const router = useRouter()

  return (
    <div className={cn('flex items-center justify-between mb-8', className)}>
      <div className="flex items-start gap-4 min-w-0 flex-1">
        {backButton && (
          <button
            onClick={() => router.push(backButton.href)}
            className="mt-1 p-2 text-white/60 hover:text-white rounded-lg hover:bg-white/[0.04] transition-colors flex-shrink-0"
            aria-label={backButton.label || "Go back"}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h1 className="text-2xl font-semibold text-white tracking-tight truncate">
              {title}
            </h1>
            {badge}
          </div>
          {description && (
            <p className="text-white/40 text-sm mt-1">
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-3 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  )
}
