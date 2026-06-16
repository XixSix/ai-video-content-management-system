"use client"

import { useState } from "react"
import { Clapperboard } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useLongToShortStore } from "@/features/long-to-short/long-to-short.store"
import { SegmentedTimeInput } from "@/features/studio-editor/inspector/components/fields/segmented-time-input"
import {
  formatChapterRange,
  getChapterDuration,
  getChapterTranscriptPreview,
} from "@/features/studio-editor/inspector/lib/chapter-time"
import {
  useStudioChapterActions,
  useStudioPlaybackState,
  useStudioProjectState,
} from "@/features/studio-editor/store/studio-editor-store"
import type { StudioChapter } from "@/features/studio-editor/studio.types"

export function ChapterInspector({ chapter }: { chapter: StudioChapter }) {
  const openLongToShort = useLongToShortStore((state) => state.openManager)
  const { updateChapterTiming, updateChapterTitle } = useStudioChapterActions()
  const { seekToTime } = useStudioPlaybackState()
  const { project } = useStudioProjectState()
  const [titleDraft, setTitleDraft] = useState(chapter.title)
  const transcriptPreview = getChapterTranscriptPreview(
    chapter,
    project.transcriptSegments
  )

  const commitTitle = () => {
    const nextTitle = titleDraft.trim()

    setTitleDraft(nextTitle)
    updateChapterTitle(chapter.id, nextTitle)
  }
  const minimumChapterDurationSeconds = project.media.durationSeconds >= 1 ? 1 : 0

  return (
    <>
      <section className="rounded-xl border border-border bg-surface-muted px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Selection
        </p>
        <div className="mt-2 flex items-center gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground">
            <Clapperboard className="size-4" />
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex min-w-0 items-center gap-2">
              <span className="shrink-0 text-sm font-medium text-foreground">
                Chapter {String(chapter.chapterIndex).padStart(2, "0")}:
              </span>
              <input
                type="text"
                value={titleDraft}
                placeholder="Title goes here"
                onChange={(event) => setTitleDraft(event.target.value)}
                onBlur={commitTitle}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") {
                    return
                  }

                  event.currentTarget.blur()
                }}
                className="min-w-0 flex-1 bg-transparent text-sm font-medium text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatChapterRange(chapter)}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface-muted">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Transcript preview</p>
        </div>

        <div className="p-4">
          <div className="max-h-40 overflow-y-auto rounded-xl border border-border bg-background/85 px-3 py-3 text-xs leading-6 text-muted-foreground">
            {transcriptPreview || "No transcript text overlaps this chapter yet."}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface-muted">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Timing</p>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(148px,1fr))] gap-2 p-4">
          <SegmentedTimeInput
            key={`start-${chapter.id}-${chapter.startTime}-${chapter.endTime}`}
            label="Start"
            valueSeconds={chapter.startTime}
            minSeconds={0}
            maxSeconds={Math.max(0, chapter.endTime - minimumChapterDurationSeconds)}
            onCommit={(valueSeconds) =>
              updateChapterTiming(chapter.id, { startTime: valueSeconds })
            }
          />
          <SegmentedTimeInput
            key={`end-${chapter.id}-${chapter.startTime}-${chapter.endTime}`}
            label="End"
            valueSeconds={chapter.endTime}
            minSeconds={Math.min(
              project.media.durationSeconds,
              chapter.startTime + minimumChapterDurationSeconds
            )}
            maxSeconds={project.media.durationSeconds}
            onCommit={(valueSeconds) =>
              updateChapterTiming(chapter.id, { endTime: valueSeconds })
            }
          />
          <div className="flex min-h-10 min-w-0 items-center rounded-xl border border-border bg-background px-3 py-2">
            <div className="flex w-full min-w-0 items-center justify-between gap-2">
              <span className="shrink-0 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                Duration
              </span>
              <div className="inline-flex h-5 shrink-0 items-center font-mono text-xs font-semibold tabular-nums text-foreground">
                {getChapterDuration(chapter)}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface-muted p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Actions
        </p>
        <div className="mt-3 grid gap-2">
          <Button
            type="button"
            size="sm"
            className="justify-start"
            onClick={() => seekToTime(chapter.startTime)}
          >
            Seek to chapter
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="justify-start"
            onClick={openLongToShort}
          >
            Open in Long to Short
          </Button>
        </div>
      </section>
    </>
  )
}
