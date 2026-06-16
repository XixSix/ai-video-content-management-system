import { FileText, Film, ImageIcon, Music2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { studioAspectRatioOptions } from "@/features/studio-editor/lib/aspect-ratio"
import type {
  StudioProjectMediaItem,
  StudioProjectMediaType,
} from "@/features/studio-editor/studio.types"
import {
  useStudioProjectActions,
  useStudioProjectState,
} from "@/features/studio-editor/store/studio-editor-store"
import { cn } from "@/lib/utils"

function MediaTypeIcon({ type }: { type: StudioProjectMediaType }) {
  if (type === "AUDIO") {
    return <Music2 className="size-4" />
  }

  if (type === "IMAGE") {
    return <ImageIcon className="size-4" />
  }

  if (type === "SUBTITLE") {
    return <FileText className="size-4" />
  }

  return <Film className="size-4" />
}

export function MediaInspector({ media }: { media: StudioProjectMediaItem }) {
  const { project } = useStudioProjectState()
  const { updateProjectAspectRatio } = useStudioProjectActions()

  return (
    <>
      <section className="rounded-xl border border-border bg-surface-muted px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Selection
        </p>
        <div className="mt-2 flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground">
            <MediaTypeIcon type={media.type} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{media.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{media.type.toLowerCase()}</p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface-muted p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Canvas ratio
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {studioAspectRatioOptions.map((option) => (
            <Button
              key={option.value}
              type="button"
              variant={
                project.media.aspectRatio === option.value ? "default" : "outline"
              }
              size="sm"
              onClick={() => updateProjectAspectRatio(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
        <div className="mt-3 rounded-lg border border-border bg-background p-3">
          <div
            className={cn(
              "mx-auto rounded-md border border-dashed border-foreground/35 bg-muted",
              project.media.aspectRatio === "16:9"
                ? "aspect-video w-full"
                : project.media.aspectRatio === "1:1"
                  ? "aspect-square w-20"
                  : project.media.aspectRatio === "4:5"
                    ? "aspect-[4/5] h-24"
                    : "aspect-[9/16] h-24"
            )}
          />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface-muted p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Media details
        </p>
        <dl className="mt-3 grid gap-2 text-xs">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Status</dt>
            <dd className="font-medium text-foreground">{media.status}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Origin</dt>
            <dd className="font-medium text-foreground">{media.origin}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Format</dt>
            <dd className="font-medium text-foreground">{media.format}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Size</dt>
            <dd className="font-medium text-foreground">
              {media.sizeLabel ?? media.metadata}
            </dd>
          </div>
        </dl>
      </section>
    </>
  )
}
