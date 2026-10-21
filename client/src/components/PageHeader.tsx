import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface PageHeaderProps {
  title: React.ReactNode
  subtitle?: React.ReactNode
  action?:
    | { label: string; onClick: () => void; icon?: React.ReactNode }
    | React.ReactNode
  className?: string
}

export function PageHeader({ title, subtitle, action, className }: PageHeaderProps) {
  return (
    <div className={cn("page-header page-enter", className)}>
      <div>
        <h1>{title}</h1>
        {subtitle && <div className="subtitle">{subtitle}</div>}
      </div>
      {action && (
        typeof action === "object" && "label" in action ? (
          <Button onClick={action.onClick} className="gap-1.5">
            {action.icon}
            {action.label}
          </Button>
        ) : (
          action
        )
      )}
    </div>
  )
}
