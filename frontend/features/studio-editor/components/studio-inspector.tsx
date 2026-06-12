"use client"

import {
  FileText,
  Film,
  ImageIcon,
  MoreHorizontal,
  Music2,
  Volume2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { useStudioEditor } from "@/features/studio-editor/studio-editor-context"
import type {
  StudioProjectMediaItem,
  StudioProjectMediaType,
  StudioSelection,
} from "@/features/studio-editor/studio.types"

function getSelectionBadge(selectionKind: StudioSelection["kind"]) {
  if (selectionKind === "media") {
    return "Media"
  }

  if (selectionKind === "source") {
    return "Source"
  }

  if (selectionKind === "segment") {
    return "Timeline"
  }

  return "Canvas"
}

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

function ControlRow({
  control,
  label,
  value,
}: {
  control?: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="grid grid-cols-[5.25rem_minmax(0,1fr)_3.5rem] items-center gap-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex min-w-0 items-center gap-3">
        {control ? <div className="shrink-0">{control}</div> : null}
        <div className="relative h-1 min-w-0 flex-1 rounded-full bg-muted">
          <div className="absolute inset-y-0 left-0 rounded-full bg-foreground/85" style={{ width: value === "100 %" ? "62%" : value === "1.0 x" ? "34%" : "3%" }} />
          <div className="absolute top-1/2 size-3 -translate-y-1/2 rounded-full bg-foreground" style={{ left: value === "100 %" ? "62%" : value === "1.0 x" ? "34%" : "3%" }} />
        </div>
      </div>
      <span className="rounded-lg border border-border bg-background px-2 py-1 text-right text-xs font-medium text-foreground">
        {value}
      </span>
    </div>
  )
}

function SelectRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="grid grid-cols-[5.25rem_minmax(0,1fr)_3.5rem] items-center gap-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <button
        type="button"
        className="flex h-8 min-w-0 items-center justify-between rounded-lg border border-border bg-background px-2 text-left text-xs font-medium text-foreground"
      >
        <span className="truncate">None</span>
        <span className="text-muted-foreground">⌄</span>
      </button>
      <span className="rounded-lg border border-border bg-background px-2 py-1 text-right text-xs font-medium text-muted-foreground">
        {value}
      </span>
    </div>
  )
}

function getMediaActions(media: StudioProjectMediaItem) {
  if (media.type === "VIDEO") {
    return ["Open in timeline", "Replace source", "Set fit mode"]
  }

  if (media.type === "AUDIO") {
    return ["Open in timeline", "Adjust volume", "Enable ducking"]
  }

  if (media.type === "IMAGE") {
    return media.linkedSelectionId
      ? ["Select canvas layer", "Adjust opacity", "Move layer order"]
      : ["Add to canvas", "Crop image", "Use as thumbnail"]
  }

  return ["Apply to Captions", "Burn into video", "Check sync"]
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

function MediaInspector({ media }: { media: StudioProjectMediaItem }) {
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

function DefaultInspector({ selectedItem }: { selectedItem: StudioSelection }) {
  return (
    <>
      <section className="rounded-xl border border-border bg-surface-muted p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Selection
        </p>
        <div className="mt-3 space-y-2">
          <span className="inline-flex rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
            {getSelectionBadge(selectedItem.kind)}
          </span>
          <p className="text-sm font-medium text-foreground">{selectedItem.label}</p>
          <p className="text-sm text-muted-foreground">{selectedItem.summary}</p>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface-muted p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Details
        </p>
        <div className="mt-3 space-y-2">
          <div className="rounded-lg border border-dashed border-border bg-background px-3 py-2 text-sm text-muted-foreground">
            {selectedItem.kind === "source" ? "Ready in canvas" : selectedItem.detail}
          </div>
          {selectedItem.kind === "segment" ? (
            <div className="rounded-lg border border-dashed border-border bg-background px-3 py-2 text-sm text-muted-foreground">
              {selectedItem.trackLabel}
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface-muted p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Actions
        </p>
        <div className="mt-3 rounded-lg border border-dashed border-border bg-background px-3 py-2 text-sm text-muted-foreground">
          Position
        </div>
      </section>
    </>
  )
}

export function StudioInspector() {
  const { selectedItem } = useStudioEditor()

  return (
    <aside className="flex h-full min-h-0 w-full flex-col overflow-hidden border-l border-border bg-background">
      <div className="border-b border-border px-4 py-3">
        <p className="text-sm font-semibold text-foreground">Inspector</p>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-auto p-4">
        {selectedItem.kind === "media" ? (
          <MediaInspector media={selectedItem.media} />
        ) : (
          <DefaultInspector selectedItem={selectedItem} />
        )}
      </div>
    </aside>
  )
}
