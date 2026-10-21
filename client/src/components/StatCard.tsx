import { forwardRef } from "react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface StatCardProps {
  value: string | number
  label: string
  sublabel?: string
  icon?: React.ReactNode
  trend?: { value: number; positive: boolean }
  accent?: boolean
  className?: string
  valueClassName?: string
  loading?: boolean
  /** Ref attached to the value span (for animations like counters) */
  valueRef?: React.Ref<HTMLSpanElement>
}

export const StatCard = forwardRef<HTMLDivElement, StatCardProps>(function StatCard(
  { value, label, sublabel, icon, trend, accent, className, valueClassName, loading, valueRef },
  ref
) {
  if (loading) {
    return (
      <Card ref={ref} className={cn("relative overflow-hidden", className)}>
        <CardContent className="p-5">
          <Skeleton className="h-7 w-20 mb-2" />
          <Skeleton className="h-3 w-32" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      ref={ref}
      className={cn(
        "relative overflow-hidden group transition-all duration-200 hover:border-border-bright hover:-translate-y-0.5 page-enter",
        className
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <span
              ref={valueRef}
              className={cn(
                "block font-[Unbounded] text-2xl font-bold tracking-tight truncate",
                accent ? "text-accent" : "text-text-bright",
                valueClassName
              )}
            >
              {value}
            </span>
            <div className="text-[11px] text-text-dim mt-1">{label}</div>
            {sublabel && (
              <div className="text-[9px] text-text-dim/60 mt-0.5">{sublabel}</div>
            )}
          </div>
          {icon && (
            <div className="flex-shrink-0 ml-3 text-text-dim/40 group-hover:text-text-dim/60 transition-colors">
              {icon}
            </div>
          )}
        </div>
        {trend && (
          <div
            className={cn(
              "mt-3 text-[11px] font-medium flex items-center gap-1",
              trend.positive ? "text-green" : "text-red"
            )}
          >
            <span>{trend.positive ? "↑" : "↓"}</span>
            <span>{Math.abs(trend.value).toFixed(1)}%</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
})
