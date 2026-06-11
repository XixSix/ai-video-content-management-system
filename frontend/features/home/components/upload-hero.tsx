import Link from "next/link"
import { FolderUp, Play, UploadCloud } from "lucide-react"

import { Button } from "@/components/ui/button"

const heroSignals = [
  "Transcript-ready",
  "Chapter generation",
  "Short clip extraction",
  "Publishing workflow",
]

export function UploadHero() {
  return (
    <section
      className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-[var(--shadow-panel)]"
      style={{
        backgroundImage:
          "linear-gradient(180deg, color-mix(in srgb, var(--surface-raised) 92%, transparent), color-mix(in srgb, var(--surface-muted) 88%, transparent))",
      }}
    >
      <div className="grid gap-8 px-5 py-6 sm:px-6 sm:py-7 lg:grid-cols-[1.2fr_0.8fr] lg:px-8 lg:py-8">
        <div className="space-y-6">
          <div className="space-y-3">
            <span className="inline-flex items-center rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground-subtle">
              Creation Hub
            </span>
            <div className="space-y-3">
              <h2 className="max-w-2xl text-2xl font-semibold leading-tight text-foreground sm:text-[2rem]">
                Upload long-form media once and keep every downstream workflow
                in motion.
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-[15px]">
                Start with a clean source file, then move into transcripts,
                chapters, subtitles, clip discovery, and publishing without
                leaving the workspace.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {heroSignals.map((signal) => (
              <span
                key={signal}
                className="inline-flex items-center rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs text-foreground-subtle"
              >
                {signal}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link href="/media-library">
                <UploadCloud className="size-4" />
                Upload media
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/studio">
                <Play className="size-4" />
                Open Studio
              </Link>
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-dashed border-border bg-background/70 p-4 shadow-[var(--shadow-natural-xs)] sm:p-5">
          <div className="flex h-full min-h-60 flex-col items-start justify-between gap-5 rounded-lg border border-border/60 bg-[color:var(--surface-raised)] p-5">
            <div className="space-y-3">
              <span className="inline-flex size-11 items-center justify-center rounded-xl border border-border/70 bg-muted text-foreground">
                <FolderUp className="size-5" />
              </span>
              <div className="space-y-1.5">
                <h3 className="text-base font-semibold text-foreground">
                  Drop in source media
                </h3>
                <p className="text-sm leading-6 text-muted-foreground">
                  Video and audio uploads land in Media Library, then become
                  available for transcript, chapter, subtitle, and clip
                  workflows.
                </p>
              </div>
            </div>

            <div className="w-full space-y-3">
              <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                <div className="rounded-lg border border-border/60 bg-muted/60 px-3 py-2">
                  MP4, MOV, WAV, MP3
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/60 px-3 py-2">
                  Single upload, multi-output
                </div>
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                Upload action routes to Media Library for now. Drag-and-drop
                handling can plug into the same surface later without changing
                the layout.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
