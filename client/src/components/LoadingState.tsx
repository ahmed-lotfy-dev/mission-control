import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

interface LoadingStateProps {
  text?: string
  variant?: "full" | "card" | "inline"
  count?: number
  className?: string
}

export function LoadingState({ text = "Loading...", variant = "full", count = 1, className }: LoadingStateProps) {
  if (variant === "inline") {
    return (
      <span className={cn("text-text-dim text-[12px]", className)}>
        <span className="animate-pulse">{text}</span>
      </span>
    )
  }

  if (variant === "card") {
    return (
      <div className={cn("space-y-3", className)}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="p-4 rounded-lg border border-border">
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col items-center justify-center py-12 text-text-dim page-enter", className)}>
      <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin mb-3" />
      <div className="text-[13px]">{text}</div>
    </div>
  )
}
