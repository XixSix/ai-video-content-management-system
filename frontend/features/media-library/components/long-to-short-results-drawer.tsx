"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import {
  CheckCircle2,
  Clapperboard,
  Download,
  Eye,
  MoreHorizontal,
  PencilLine,
  Search,
  Send,
  Share2,
  Trash2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import type {
  LongToShortCandidate,
  LongToShortPlatform,
} from "@/features/long-to-short/long-to-short.types"
import type { MediaLibraryItem } from "../media-library.types"
import { formatDuration, formatFileSize, formatShortDate } from "../media-library.utils"

type LongToShortResultsDrawerProps = {
  source: MediaLibraryItem | null
  candidates: LongToShortCandidate[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatSecondsAsClock(totalSeconds: number) {
  const safeValue = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(safeValue / 60)
  const seconds = safeValue % 60

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

function getTimeRangeLabel(candidate: LongToShortCandidate) {
  return `${formatSecondsAsClock(candidate.startTime)}-${formatSecondsAsClock(candidate.endTime)}`
}

function getPlatformLabel(platform: LongToShortPlatform) {
  if (platform === "YOUTUBE_SHORTS") {
    return "YouTube Shorts"
  }

  if (platform === "INSTAGRAM_REELS") {
    return "Instagram Reels"
  }

  return "TikTok"
}

function CandidateThumbnail({
  candidate,
  index,
  isPreview = false,
}: {
  candidate: LongToShortCandidate
  index: number
  isPreview?: boolean
}) {
  const backgrounds = [
    "bg-[linear-gradient(155deg,rgba(11,52,64,0.98),rgba(14,18,27,0.98))]",
    "bg-[linear-gradient(155deg,rgba(64,32,22,0.98),rgba(13,14,18,0.98))]",
    "bg-[linear-gradient(155deg,rgba(45,36,78,0.98),rgba(12,12,18,0.98))]",
    "bg-[linear-gradient(155deg,rgba(27,57,38,0.98),rgba(11,14,12,0.98))]",
  ]

  return (
    <div
      className={cn(
        "relative mx-auto aspect-video w-full overflow-hidden rounded-xl border border-border/80 shadow-[0_16px_40px_rgba(0,0,0,0.18)]",
        backgrounds[index % backgrounds.length],
        isPreview ? "max-w-xl" : "max-w-[14rem]"
      )}
    >
      <div className="absolute left-2 top-2 rounded-md bg-black/70 px-2 py-1 text-[10px] font-semibold text-white">
        {candidate.aspectRatio}
      </div>
      <div className="absolute right-2 top-2 rounded-md bg-black/70 px-2 py-1 text-[10px] font-semibold text-white">
        {formatSecondsAsClock(candidate.duration)}
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_38%_25%,rgba(255,255,255,0.22),transparent_26%),radial-gradient(circle_at_72%_18%,rgba(125,211,252,0.22),transparent_26%)]" />
      <div className="absolute left-[18%] top-[24%] size-20 rounded-full border border-white/20 bg-white/15" />
      <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.72))]" />
      <div className="absolute inset-x-3 bottom-4 rounded-lg bg-black/72 px-2 py-1.5 text-center shadow-sm">
        <p className="text-[11px] font-semibold leading-tight text-lime-300">
          {candidate.title}
        </p>
        <p className="mt-1 text-[10px] font-semibold leading-tight text-white">
          {candidate.caption}
        </p>
      </div>
    </div>
  )
}

export function LongToShortResultsDrawer({
  source,
  candidates,
  open,
  onOpenChange,
}: LongToShortResultsDrawerProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [previewCandidateId, setPreviewCandidateId] = useState<string | null>(null)

  const filteredCandidates = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return candidates.filter((candidate) => {
      const matchesQuery =
        !query ||
        [candidate.title, candidate.caption, candidate.transcript]
          .join(" ")
          .toLowerCase()
          .includes(query)

      return matchesQuery
    })
  }, [candidates, searchQuery])

  const previewCandidate =
    candidates.find((candidate) => candidate.id === previewCandidateId) ?? null
  const previewIndex = previewCandidate
    ? candidates.findIndex((candidate) => candidate.id === previewCandidate.id)
    : -1

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[min(100vw,58rem)] gap-0 overflow-y-auto p-0 sm:max-w-[58rem]">
        <SheetHeader className="border-b border-border/70 px-5 pb-4 pt-5 pr-14 sm:px-6">
          <SheetTitle className="text-xl font-semibold">
            {source?.title ?? "Long to Short results"}
          </SheetTitle>
          <SheetDescription>
            {source
              ? `${source.originalFilename} · ${source.duration !== null ? formatDuration(source.duration) : "Pending"} · ${formatFileSize(source.fileSizeBytes)} · Updated ${formatShortDate(source.updatedAt)}`
              : "Review generated clip candidates from a source media item."}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-5 py-5 sm:px-6">
          <div>
            <label className="relative flex-1">
              <span className="sr-only">Search candidate clips</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-10 rounded-xl pl-9"
                placeholder="Search clip candidates..."
              />
            </label>
          </div>

          {previewCandidate ? (
            <section className="rounded-xl border border-border/70 bg-background/70 p-4">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
                <CandidateThumbnail
                  candidate={previewCandidate}
                  index={Math.max(previewIndex, 0)}
                  isPreview
                />
                <div className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      {previewCandidate.title}
                    </p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {previewCandidate.caption}
                    </p>
                  </div>
                  <div className="grid gap-2 text-xs text-muted-foreground">
                    <span>{getTimeRangeLabel(previewCandidate)}</span>
                    <span>{getPlatformLabel(previewCandidate.platform)}</span>
                    <span>{previewCandidate.transcriptVersionLabel}</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewCandidateId(null)}
                  >
                    Close preview
                  </Button>
                </div>
              </div>
            </section>
          ) : null}

          {filteredCandidates.length < 1 ? (
            <div className="rounded-xl border border-dashed border-border bg-background/60 px-5 py-12 text-center">
              <p className="text-sm font-medium text-foreground">
                No clip candidates found
              </p>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                Try another search term for this source media.
              </p>
            </div>
          ) : (
            <div className="max-h-[calc(100vh-20rem)] space-y-3 overflow-y-auto pr-1">
              {filteredCandidates.map((candidate) => {
                const sourceIndex = candidates.findIndex(
                  (sourceCandidate) => sourceCandidate.id === candidate.id
                )

                return (
                  <article
                    key={candidate.id}
                    className="grid gap-3 rounded-xl border border-border/70 bg-background/70 p-3 shadow-[var(--shadow-card)] transition hover:border-foreground/20 hover:bg-card sm:grid-cols-[10rem_minmax(0,1fr)]"
                  >
                    <button
                      type="button"
                      onClick={() => setPreviewCandidateId(candidate.id)}
                      className="block w-full text-left"
                    >
                      <CandidateThumbnail
                        candidate={candidate}
                        index={Math.max(sourceIndex, 0)}
                      />
                    </button>

                    <div className="min-w-0 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <span className="text-lg font-semibold text-foreground">
                            #{sourceIndex + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => setPreviewCandidateId(candidate.id)}
                            className="mt-1 block line-clamp-2 text-left text-base font-semibold leading-6 text-foreground hover:underline"
                          >
                            {candidate.title}
                          </button>
                        </div>
                      </div>

                      <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
                        {candidate.caption}
                      </p>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                        <span>{getTimeRangeLabel(candidate)}</span>
                        <span>{getPlatformLabel(candidate.platform)}</span>
                        <span>{candidate.transcriptVersionLabel}</span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon-sm"
                          onClick={() => setPreviewCandidateId(candidate.id)}
                        >
                          <span className="sr-only">Preview clip</span>
                          <Eye className="size-4" />
                        </Button>
                        <Button type="button" variant="outline" size="icon-sm" asChild>
                          <Link href="/studio">
                            <span className="sr-only">Open in Studio</span>
                            <Clapperboard className="size-4" />
                          </Link>
                        </Button>
                        <Button type="button" variant="outline" size="icon-sm">
                          <span className="sr-only">Download clip</span>
                          <Download className="size-4" />
                        </Button>
                        <Button type="button" variant="outline" size="icon-sm">
                          <span className="sr-only">Publish clip</span>
                          <Send className="size-4" />
                        </Button>
                        <Button type="button" variant="outline" size="icon-sm">
                          <span className="sr-only">Share clip</span>
                          <Share2 className="size-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon-sm"
                              aria-label="Open clip actions"
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 min-w-44">
                            <DropdownMenuItem onSelect={(event) => event.preventDefault()}>
                              <PencilLine className="size-4" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={(event) => event.preventDefault()}>
                              <CheckCircle2 className="size-4" />
                              Select clip
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onSelect={(event) => event.preventDefault()}
                              variant="destructive"
                            >
                              <Trash2 className="size-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
