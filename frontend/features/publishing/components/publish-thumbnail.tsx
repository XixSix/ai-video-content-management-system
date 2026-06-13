import { FileVideo2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { PublishTask } from "../publishing.types"

type PublishThumbnailProps = {
  task: Pick<
    PublishTask,
    "thumbnailUrl" | "sourceTitle" | "aspectRatio" | "durationLabel"
  >
  compact?: boolean
}

export function PublishThumbnail({ task, compact = false }: PublishThumbnailProps) {
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-xl border border-border/70 bg-muted",
        compact ? "h-20 w-16" : "h-24 w-32"
      )}
    >
      {task.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={task.thumbnailUrl}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_25%_20%,color-mix(in_srgb,var(--foreground)_16%,transparent),transparent_34%),linear-gradient(135deg,var(--surface-muted),var(--surface-inset))]">
          <FileVideo2 className="size-5 text-muted-foreground" />
        </div>
      )}

      <div className="absolute left-1.5 top-1.5">
        <Badge variant="neutral" className="bg-background/85 backdrop-blur">
          {task.aspectRatio}
        </Badge>
      </div>
      <div className="absolute bottom-1.5 right-1.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white">
        {task.durationLabel}
      </div>
    </div>
  )
}
