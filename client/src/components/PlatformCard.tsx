import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"

interface PlatformCardProps {
  icon: string
  label: string
  color: string
  count?: number
  followers?: number
  selected?: boolean
  onClick?: () => void
}

export function PlatformCard({ icon, label, color, count, followers, selected, onClick }: PlatformCardProps) {
  return (
    <Card
      className={cn(
        "cursor-pointer text-center transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-black/10 page-enter",
        selected && "ring-1 ring-accent/30"
      )}
      onClick={onClick}
    >
      <div className="p-4">
        <div className="text-[28px] mb-2" style={{ color }}>{icon}</div>
        <div className="font-semibold text-[13px] text-text-bright">{label}</div>
        {followers != null && followers > 0 ? (
          <>
            <div className="text-[10px] text-green mt-1">
              {(followers >= 1000 ? (followers / 1000).toFixed(1) + "K" : followers)} followers
            </div>
            <div className="text-[10px] text-text-dim">{count ?? 0} posts tracked</div>
          </>
        ) : (
          <div className="text-[10px] text-text-dim mt-2">{count ?? 0} posts</div>
        )}
      </div>
    </Card>
  )
}
