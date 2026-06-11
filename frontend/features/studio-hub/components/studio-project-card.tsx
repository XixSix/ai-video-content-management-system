import Link from "next/link"
import { AudioWaveform, Clapperboard, MoreHorizontal, PlayCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { formatShortDate } from "@/features/home/home.utils"
import type { StudioProject } from "@/features/studio-hub/studio-projects.types"

type StudioProjectCardProps = {
  project: StudioProject
  featured?: boolean
}

const thumbnailVariantClassName = {
  teal: "from-[#0f6278] via-[#17495b] to-[#0f2d3c]",
  slate: "from-[#30465e] via-[#1d2837] to-[#121821]",
  olive: "from-[#536746] via-[#364330] to-[#1c2419]",
  ember: "from-[#7a4831] via-[#42251b] to-[#1f130f]",
} as const

export function StudioProjectCard({
  project,
  featured = false,
}: StudioProjectCardProps) {
  const SourceIcon =
    project.sourceType === "VIDEO" ? Clapperboard : AudioWaveform

  return (
    <Card
      className={cn(
        "border-border/70 bg-card/95 py-0 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-panel)]",
        featured ? "lg:grid lg:grid-cols-[minmax(0,1.18fr)_minmax(360px,0.82fr)]" : ""
      )}
    >
      <Link
        href={`/editor/${project.slug}`}
        className={cn(
          "block border-b border-border/60",
          featured ? "lg:border-b-0 lg:border-r" : ""
        )}
      >
        <div
          className={cn(
            "relative overflow-hidden bg-muted",
            featured ? "aspect-[16/8.5] lg:h-full lg:min-h-[252px]" : "aspect-video"
          )}
        >
          <div
            className={cn(
              "absolute inset-0 bg-gradient-to-br",
              thumbnailVariantClassName[project.thumbnailVariant]
            )}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.15),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(0,0,0,0.14))]" />
          <div className="absolute inset-0 flex flex-col justify-end p-4">
            <div className="flex items-end justify-between gap-3">
              <span className="inline-flex size-11 items-center justify-center rounded-lg border border-white/14 bg-black/18 text-white">
                <SourceIcon className="size-4" />
              </span>
              <div className="rounded-full bg-black/32 px-3 py-1 text-[11px] font-medium text-white/80">
                Updated {formatShortDate(project.updatedAt)}
              </div>
            </div>
          </div>
        </div>
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <CardHeader className={cn("gap-2 pb-3", featured ? "lg:px-6 lg:pt-6" : "")}>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
            <CardTitle
              className={cn(
                "line-clamp-2 text-[15px]",
                featured ? "lg:max-w-[14ch] lg:text-[2rem] lg:leading-[1.02]" : ""
              )}
            >
              <Link
                href={`/editor/${project.slug}`}
                className="hover:text-foreground-subtle"
              >
                {project.name}
              </Link>
            </CardTitle>
            <Button
              variant="ghost"
              size="icon-sm"
              className="shrink-0"
              aria-label="Project actions"
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent
          className={cn("pb-4", featured ? "lg:flex-1 lg:px-6 lg:pb-6" : "")}
        >
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Main source
            </p>
            <p className="text-sm text-foreground">{project.mainSourceMedia}</p>
            <p className="text-sm text-muted-foreground">
              Workspace updated {formatShortDate(project.updatedAt)}
            </p>
          </div>
        </CardContent>

        <CardFooter className={cn("justify-end gap-2", featured ? "lg:px-6" : "")}>
          <Button size="sm" asChild>
            <Link href={`/editor/${project.slug}`}>
              <PlayCircle className="size-4" />
              Open Studio
            </Link>
          </Button>
        </CardFooter>
      </div>
    </Card>
  )
}
