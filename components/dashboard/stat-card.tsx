import type { ReactNode } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export type StatCardProps = {
  icon: ReactNode
  value: string | number
  title: string
  changePercentage?: string
  changeLabel?: string
  className?: string
  onClick?: () => void
}

export function StatCard({
  icon,
  value,
  title,
  changePercentage,
  changeLabel = "than last week",
  className,
  onClick
}: StatCardProps) {
  return (
    <Card 
      className={cn(
        'relative overflow-hidden gap-3 w-full border-white/[0.14] bg-[#1B1C20] transition-all duration-200 flex flex-col h-full',
        onClick && 'cursor-pointer group',
        className
      )}
      onClick={onClick}
    >
      <div className='pointer-events-none absolute inset-0 bg-[linear-gradient(145deg,rgba(255,255,255,0.18)_0%,rgba(255,255,255,0)_42%)]' />
      <div className='pointer-events-none absolute -right-10 -top-8 h-28 w-28 rounded-full bg-white/18 blur-[1px]' />
      <div className='pointer-events-none absolute right-8 -top-5 h-24 w-14 rotate-[38deg] rounded-full bg-white/14' />
      <div className='pointer-events-none absolute right-2 top-4 h-20 w-12 rotate-[38deg] rounded-full bg-white/9' />
      <div className='pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/18 to-transparent' />
      <CardHeader className='flex items-center p-4 pb-1.5'>
        <div className='bg-black/12 text-white flex size-10 shrink-0 items-center justify-center rounded-lg border border-white/20'>
          {icon}
        </div>
        <span className='text-3xl font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]'>{value}</span>
      </CardHeader>
      <CardContent className='flex flex-col gap-0.5 px-4 pb-3.5 flex-1'>
        <span className='font-medium text-white text-sm leading-tight'>{title}</span>
        {changePercentage && (
          <p className='flex items-center gap-1.5 text-sm flex-wrap'>
            <span className={cn(
              'font-semibold whitespace-nowrap',
              changePercentage.startsWith('+') ? 'text-emerald-100' : 
              changePercentage.startsWith('-') ? 'text-red-200' : 
              'text-white/85'
            )}>
              {changePercentage}
            </span>
            <span className='text-white/80 whitespace-nowrap'>{changeLabel}</span>
          </p>
        )}
      </CardContent>
    </Card>
  )
}
