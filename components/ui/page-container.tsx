import { cn } from "@/lib/utils"

interface PageContainerProps {
  children: React.ReactNode
  className?: string
  fullWidth?: boolean
  scrollable?: boolean
}

export function PageContainer({ children, className, fullWidth = false, scrollable = false }: PageContainerProps) {
  return (
    <div className={cn(
      "flex-1 w-full",
      scrollable ? "overflow-y-auto" : "",
      !fullWidth && "max-w-7xl mx-auto p-6 md:p-8",
      className
    )}>
      {children}
    </div>
  )
}
