"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import {
  Clapperboard,
  Copy,
  Download,
  Edit3,
  Expand,
  FileText,
  Maximize2,
  MoreHorizontal,
  Pause,
  Play,
  Send,
  Share2,
  Sparkles,
  Volume2,
  Wand2,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { LongToShortCandidate } from "@/features/long-to-short/long-to-short.types"
import type { MediaLibraryItem, MediaLibraryTab } from "../media-library.types"

type MediaLibraryPreviewDialogProps = {
  item: MediaLibraryItem | null
  activeTab: MediaLibraryTab
  candidates: LongToShortCandidate[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatSecondsAsClock(totalSeconds: number | null) {
  if (totalSeconds === null) {
    return "00:00"
  }

  const safeValue = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(safeValue / 60)
  const seconds = safeValue % 60

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

function getCandidateTimeRange(candidate: LongToShortCandidate) {
  return `${formatSecondsAsClock(candidate.startTime)}-${formatSecondsAsClock(
    candidate.endTime
  )}`
}

function getPreviewBackground(seed: number) {
  const backgrounds = [
    "bg-[linear-gradient(155deg,rgba(9,38,48,0.98),rgba(13,16,23,0.98))]",
    "bg-[linear-gradient(155deg,rgba(56,32,23,0.98),rgba(13,14,18,0.98))]",
    "bg-[linear-gradient(155deg,rgba(43,37,74,0.98),rgba(12,12,18,0.98))]",
    "bg-[linear-gradient(155deg,rgba(26,55,39,0.98),rgba(11,14,12,0.98))]",
  ]

  return backgrounds[seed % backgrounds.length]
}

function PreviewPoster({
  item,
  candidate,
  candidateIndex,
}: {
  item: MediaLibraryItem
  candidate: LongToShortCandidate | null
  candidateIndex: number
}) {
  const isClipPreview = Boolean(candidate)
  const title = candidate?.title ?? item.title
  const caption = candidate?.caption ?? item.originalFilename

  return (
    <div
      className={cn(
        "relative mx-auto flex w-full overflow-hidden rounded-xl border border-white/10 bg-black text-white shadow-[0_24px_80px_rgba(0,0,0,0.28)]",
        isClipPreview
          ? "aspect-[9/16] max-h-[min(58vh,34rem)] max-w-[19rem]"
          : "aspect-video max-h-[min(58vh,34rem)]",
        getPreviewBackground(Math.max(candidateIndex, 0))
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_34%_18%,rgba(255,255,255,0.2),transparent_28%),radial-gradient(circle_at_76%_20%,rgba(132,204,22,0.2),transparent_24%)]" />
      <div className="absolute left-[18%] top-[22%] size-28 rounded-full border border-white/15 bg-white/10" />
      <div className="absolute right-[14%] top-[34%] size-16 rounded-full border border-white/10 bg-white/8" />
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.86))]" />

      <div className="relative z-10 flex min-h-full w-full flex-col justify-between p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-md bg-black/60 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white/80">
            {isClipPreview ? "Clip preview" : item.type}
          </span>
          <span className="rounded-md bg-black/60 px-2 py-1 text-[10px] font-semibold text-white/80">
            Poster fallback
          </span>
        </div>

        <div className="mx-auto flex size-16 items-center justify-center rounded-full border border-white/20 bg-white/12 backdrop-blur">
          <Play className="ml-1 size-7 fill-white text-white" />
        </div>

        <div className="space-y-2 rounded-xl bg-black/58 p-3 text-center backdrop-blur-sm">
          <p className="line-clamp-2 text-sm font-semibold leading-tight text-white">
            {title}
          </p>
          <p className="line-clamp-2 text-xs leading-5 text-white/70">{caption}</p>
        </div>
      </div>
    </div>
  )
}

function PlayerControls({
  item,
  candidate,
}: {
  item: MediaLibraryItem
  candidate: LongToShortCandidate | null
}) {
  const duration = candidate?.duration ?? item.duration

  return (
    <div className="rounded-xl border border-border/70 bg-card/95 p-3 shadow-[var(--shadow-card)]">
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full w-[18%] rounded-full bg-foreground" />
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button type="button" size="icon-lg" className="rounded-full">
            <Play className="ml-0.5 size-4 fill-current" />
            <span className="sr-only">Play preview</span>
          </Button>
          <Button type="button" size="icon-sm" variant="ghost">
            <Pause className="size-4" />
            <span className="sr-only">Pause preview</span>
          </Button>
          <span className="text-xs font-medium text-muted-foreground">
            00:00 / {formatSecondsAsClock(duration)}
          </span>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-muted/70 p-1">
          <Button type="button" size="icon-sm" variant="ghost">
            <Volume2 className="size-4" />
            <span className="sr-only">Volume</span>
          </Button>
          <Button type="button" size="sm" variant="ghost" className="px-2">
            1x
          </Button>
          <Button type="button" size="icon-sm" variant="ghost">
            <Maximize2 className="size-4" />
            <span className="sr-only">Open fullscreen</span>
          </Button>
        </div>
      </div>
    </div>
  )
}

function MediaPlayerPanel({
  item,
  candidate,
  candidateIndex,
}: {
  item: MediaLibraryItem
  candidate: LongToShortCandidate | null
  candidateIndex: number
}) {
  return (
    <section className="flex min-h-0 flex-col gap-3 border-b border-border/70 bg-black/[0.03] p-4 dark:bg-black/25 lg:border-b-0 lg:border-r">
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <PreviewPoster
          item={item}
          candidate={candidate}
          candidateIndex={candidateIndex}
        />
      </div>
      <PlayerControls item={item} candidate={candidate} />
    </section>
  )
}

function ContextPanel({
  item,
  activeTab,
  candidate,
}: {
  item: MediaLibraryItem
  activeTab: MediaLibraryTab
  candidate: LongToShortCandidate | null
}) {
  if (activeTab === "LONG_TO_SHORT" && candidate) {
    return (
      <section className="min-h-0 overflow-y-auto border-b border-border/70 p-4 lg:border-b-0 lg:border-r">
        <div className="space-y-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Clip context
            </p>
            <h2 className="text-xl font-semibold leading-tight text-foreground">
              {candidate.title}
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">
              {candidate.caption}
            </p>
          </div>

          <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <span className="rounded-lg border border-border/70 bg-muted/50 px-3 py-2">
              {getCandidateTimeRange(candidate)}
            </span>
            <span className="rounded-lg border border-border/70 bg-muted/50 px-3 py-2">
              {candidate.aspectRatio}
            </span>
            <span className="rounded-lg border border-border/70 bg-muted/50 px-3 py-2">
              {candidate.transcriptVersionLabel}
            </span>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Scene analysis</p>
            <div className="flex flex-wrap gap-2">
              {candidate.reviewNotes.map((note) => (
                <span
                  key={note}
                  className="rounded-full border border-border/70 bg-background px-2.5 py-1 text-xs font-medium text-foreground-subtle"
                >
                  {note}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Transcript</p>
            <p className="rounded-xl border border-border/70 bg-muted/45 p-3 text-sm leading-6 text-foreground-subtle">
              {candidate.transcript}
            </p>
          </div>
        </div>
      </section>
    )
  }

  if (activeTab === "EDITOR_OUTPUTS" || item.libraryGroup === "EDITOR_OUTPUT") {
    return (
      <section className="min-h-0 overflow-y-auto border-b border-border/70 p-4 lg:border-b-0 lg:border-r">
        <div className="space-y-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Output preview
            </p>
            <h2 className="text-xl font-semibold leading-tight text-foreground">
              {item.title}
            </h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Generated output from the source workspace. Full editing still
              happens in Studio.
            </p>
          </div>

          <div className="rounded-xl border border-border/70 bg-muted/45 p-3">
            <p className="text-sm font-semibold text-foreground">
              Transcript/output notes
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Preview text and rendered output metadata will be wired here when
              generated assets expose playable URLs and transcript snippets.
            </p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="min-h-0 overflow-y-auto border-b border-border/70 p-4 lg:border-b-0 lg:border-r">
      <div className="space-y-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Source media
          </p>
          <h2 className="text-xl font-semibold leading-tight text-foreground">
            {item.title}
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            Preview the original upload and launch the next workflow from the
            action rail.
          </p>
        </div>

        <div className="grid gap-2 text-sm text-muted-foreground">
          <span className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/45 px-3 py-2">
            <span>Transcript</span>
            <span>{item.hasTranscript ? "Ready" : "Not generated"}</span>
          </span>
          <span className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/45 px-3 py-2">
            <span>Chapters</span>
            <span>{item.hasChapters ? "Ready" : "Not generated"}</span>
          </span>
          <span className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/45 px-3 py-2">
            <span>Short clips</span>
            <span>{item.hasClips ? "Ready" : "Not generated"}</span>
          </span>
        </div>
      </div>
    </section>
  )
}

function ActionRail({
  isLongToShort,
}: {
  isLongToShort: boolean
}) {
  const actions = isLongToShort
    ? [
        { label: "Edit clip", icon: Edit3, href: "/studio" },
        { label: "Publish", icon: Send },
        { label: "Download", icon: Download },
        { label: "Enhance", icon: Wand2 },
        { label: "Duplicate", icon: Copy },
        { label: "More", icon: MoreHorizontal },
      ]
    : [
        { label: "Open Studio", icon: Clapperboard, href: "/studio" },
        { label: "Transcript", icon: FileText },
        { label: "Create clips", icon: Sparkles },
        { label: "Download", icon: Download },
        { label: "Share", icon: Share2 },
        { label: "More", icon: MoreHorizontal },
      ]

  return (
    <TooltipProvider>
      <aside className="flex gap-2 overflow-x-auto border-b border-border/70 p-3 lg:flex-col lg:items-center lg:overflow-visible lg:border-b-0 lg:border-r">
        {actions.map((action) => {
          const Icon = action.icon
          const button = (
            <Button
              type="button"
              variant={action.href ? "default" : "outline"}
              size="icon-lg"
              className="rounded-xl"
              asChild={Boolean(action.href)}
            >
              {action.href ? (
                <Link href={action.href}>
                  <Icon className="size-4" />
                  <span className="sr-only">{action.label}</span>
                </Link>
              ) : (
                <>
                  <Icon className="size-4" />
                  <span className="sr-only">{action.label}</span>
                </>
              )}
            </Button>
          )

          return (
            <Tooltip key={action.label}>
              <TooltipTrigger asChild>{button}</TooltipTrigger>
              <TooltipContent side="left">{action.label}</TooltipContent>
            </Tooltip>
          )
        })}
      </aside>
    </TooltipProvider>
  )
}

function ClipSelector({
  candidates,
  selectedCandidateId,
  onSelectCandidate,
}: {
  candidates: LongToShortCandidate[]
  selectedCandidateId: string | null
  onSelectCandidate: (candidateId: string) => void
}) {
  return (
    <aside className="min-h-0 border-border/70 p-4 lg:border-l">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Next clips
          </p>
          <p className="text-sm font-semibold text-foreground">
            {candidates.length} candidates
          </p>
        </div>
        <Expand className="size-4 text-muted-foreground" />
      </div>

      <div className="max-h-[18rem] space-y-2 overflow-y-auto pr-1 lg:max-h-full">
        {candidates.map((candidate, index) => {
          const isSelected = candidate.id === selectedCandidateId

          return (
            <button
              key={candidate.id}
              type="button"
              onClick={() => onSelectCandidate(candidate.id)}
              className={cn(
                "grid w-full grid-cols-[5.25rem_minmax(0,1fr)] gap-3 rounded-xl border p-2 text-left transition hover:border-foreground/30 hover:bg-muted/70",
                isSelected
                  ? "border-foreground/35 bg-muted"
                  : "border-border/70 bg-background/60"
              )}
            >
              <div
                className={cn(
                  "relative aspect-video overflow-hidden rounded-lg border border-white/10",
                  getPreviewBackground(index)
                )}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_22%,rgba(255,255,255,0.26),transparent_28%)]" />
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.82))]" />
              </div>
              <div className="min-w-0 self-center">
                <p className="text-sm font-semibold text-foreground">#{index + 1}</p>
                <p className="mt-1 line-clamp-2 text-sm font-medium leading-5 text-foreground-subtle">
                  {candidate.title}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </aside>
  )
}

export function MediaLibraryPreviewDialog({
  item,
  activeTab,
  candidates,
  open,
  onOpenChange,
}: MediaLibraryPreviewDialogProps) {
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null)

  const selectedCandidate = useMemo(() => {
    if (activeTab !== "LONG_TO_SHORT") {
      return null
    }

    return (
      candidates.find((candidate) => candidate.id === selectedCandidateId) ??
      candidates[0] ??
      null
    )
  }, [activeTab, candidates, selectedCandidateId])

  if (!item) {
    return null
  }

  const selectedCandidateIndex = selectedCandidate
    ? candidates.findIndex((candidate) => candidate.id === selectedCandidate.id)
    : -1
  const isLongToShortPreview = activeTab === "LONG_TO_SHORT" && candidates.length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        showCloseButton={false}
        className="h-[min(90vh,54rem)] max-h-[90vh] max-w-[min(96vw,92rem)] gap-0 overflow-hidden rounded-xl bg-background p-0 shadow-[0_28px_90px_rgba(0,0,0,0.32)] sm:max-w-[min(96vw,92rem)]"
      >
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border/70 px-3 sm:px-4">
          <DialogClose asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="rounded-full"
            >
              <X className="size-4" />
              <span className="sr-only">Close preview</span>
            </Button>
          </DialogClose>
          <DialogTitle className="min-w-0 truncate text-sm font-semibold sm:text-base">
            {item.originalFilename || item.title}
          </DialogTitle>
        </header>

        <div
          className={cn(
            "grid min-h-0 flex-1 overflow-y-auto lg:overflow-hidden",
            isLongToShortPreview
              ? "lg:grid-cols-[minmax(20rem,0.92fr)_minmax(20rem,0.82fr)_4.5rem_minmax(15rem,18rem)]"
              : "lg:grid-cols-[minmax(20rem,1fr)_minmax(18rem,0.78fr)_4.5rem]"
          )}
        >
          <MediaPlayerPanel
            item={item}
            candidate={selectedCandidate}
            candidateIndex={selectedCandidateIndex}
          />
          <ContextPanel
            item={item}
            activeTab={activeTab}
            candidate={selectedCandidate}
          />
          <ActionRail isLongToShort={isLongToShortPreview} />
          {isLongToShortPreview ? (
            <ClipSelector
              candidates={candidates}
              selectedCandidateId={selectedCandidate?.id ?? null}
              onSelectCandidate={setSelectedCandidateId}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
