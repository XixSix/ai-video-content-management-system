import { FileText, Film, ImageIcon, MoreHorizontal, Music2, Volume2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ControlRow, SelectRow } from "@/features/studio-editor/inspector/components/inspector-fields"
import { getMediaActions } from "@/features/studio-editor/inspector/lib/media-actions"
import type {
  StudioProjectMediaItem,
  StudioProjectMediaType,
} from "@/features/studio-editor/studio.types"

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

function MediaEditPanel({ media }: { media: StudioProjectMediaItem }) {
  const title =
    media.type === "AUDIO" ? "Edit Audio" : media.type === "IMAGE" ? "Edit Image" : "Edit Video"

  return (
    <section className="rounded-xl border border-border bg-surface-muted">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="More media settings">
          <MoreHorizontal className="size-4" />
        </Button>
      </div>

      <div className="space-y-5 p-4">
        {media.type === "VIDEO" || media.type === "IMAGE" ? (
          <div className="grid grid-cols-3 gap-2">
            {["Fit", "Fill", "Crop"].map((mode) => (
              <Button
                key={mode}
                type="button"
                variant={mode === "Fit" ? "default" : "outline"}
                size="sm"
              >
                {mode}
              </Button>
            ))}
          </div>
        ) : null}

        <div className="space-y-3">
          <p className="text-xs font-semibold text-foreground">Playback</p>
          <ControlRow
            label="Volume"
            value={media.type === "AUDIO" && media.usageLabel === "Music" ? "-18 dB" : "100 %"}
            control={
              <span className="flex size-8 items-center justify-center rounded-lg border border-border bg-background">
                <Volume2 className="size-4 text-foreground" />
              </span>
            }
          />
          <ControlRow label="Fade In" value="0 s" />
          <ControlRow label="Fade Out" value="0 s" />
          <ControlRow label="Speed" value="1.0 x" />
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold text-foreground">Animation</p>
          <SelectRow label="In" value="0.0 s" />
          <SelectRow label="Out" value="0.0 s" />
        </div>
      </div>
    </section>
  )
}

export function MediaInspector({ media }: { media: StudioProjectMediaItem }) {
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

      <MediaEditPanel media={media} />

      <section className="rounded-xl border border-border bg-surface-muted p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Actions
        </p>
        <div className="mt-3 grid gap-2">
          {getMediaActions(media).map((action, actionIndex) => (
            <Button
              key={action}
              type="button"
              variant={actionIndex === 0 ? "default" : "outline"}
              size="sm"
              className="justify-start"
            >
              {action}
            </Button>
          ))}
        </div>
      </section>
    </>
  )
}
