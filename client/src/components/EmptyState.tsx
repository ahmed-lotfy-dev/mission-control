import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon: string
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12 text-text-dim text-center page-enter", className)}>
      <div className="text-[40px] mb-3">{icon}</div>
      <p className="text-[14px]">{title}</p>
      {description && (
        <div className="text-[12px] mt-1 opacity-60">{description}</div>
      )}
      {action && (
        <button className="btn btn-primary mt-4" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </div>
  )
}
