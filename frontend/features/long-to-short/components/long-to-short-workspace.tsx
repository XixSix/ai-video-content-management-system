"use client"

import Link from "next/link"
import { useState } from "react"
import {
  AudioWaveform,
  Clapperboard,
  PlayCircle,
  WandSparkles,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  defaultLongToShortSettings,
  longToShortCandidatesBySourceId,
  longToShortClipsBySourceId,
  longToShortJobsBySourceId,
  longToShortSources,
} from "@/features/long-to-short/long-to-short.data"
import type {
  LongToShortCandidate,
  LongToShortCandidateStatus,
  LongToShortClip,
  LongToShortClipStatus,
  LongToShortPlatform,
  LongToShortSettings,
} from "@/features/long-to-short/long-to-short.types"
import { cn } from "@/lib/utils"

type SelectedWorkspaceItem =
  | {
      id: string
      kind: "candidate"
    }
  | {
      id: string
      kind: "clip"
    }
  | null

function formatClipTime(timeSeconds: number) {
  const totalSeconds = Math.max(0, Math.floor(timeSeconds))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

function getRangeLabel(startTime: number, endTime: number) {
  return `${formatClipTime(startTime)} - ${formatClipTime(endTime)}`
}

function getSourceStatusBadge(status: "READY" | "PROCESSING" | "NEEDS_TRANSCRIPT") {
  if (status === "PROCESSING") {
    return { label: "Processing", variant: "info" as const }
  }

  if (status === "NEEDS_TRANSCRIPT") {
    return { label: "Needs transcript", variant: "warning" as const }
  }

  return { label: "Ready", variant: "success" as const }
}

function getJobBadge(status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED") {
  if (status === "FAILED") {
    return { label: "Failed", variant: "danger" as const }
  }

  if (status === "COMPLETED") {
    return { label: "Completed", variant: "success" as const }
  }

  if (status === "RUNNING") {
    return { label: "Running", variant: "info" as const }
  }

  return { label: "Queued", variant: "neutral" as const }
}

function getCandidateBadge(
  status: LongToShortCandidateStatus,
  isOutdated?: boolean
) {
  if (status === "REJECTED") {
    return { label: "Rejected", variant: "danger" as const }
  }

  if (status === "SELECTED") {
    return { label: "Selected", variant: "success" as const }
  }

  if (isOutdated) {
    return { label: "Outdated", variant: "warning" as const }
  }

  if (status === "NEEDS_REVIEW") {
    return { label: "Needs review", variant: "neutral" as const }
  }

  return { label: "Recommended", variant: "info" as const }
}

function getClipBadge(status: LongToShortClipStatus) {
  if (status === "FAILED") {
    return { label: "Failed", variant: "danger" as const }
  }

  if (status === "READY") {
    return { label: "Ready", variant: "success" as const }
  }

  return { label: "Draft", variant: "neutral" as const }
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

function getInitialSelection(sourceId: string): SelectedWorkspaceItem {
  const candidates = longToShortCandidatesBySourceId[sourceId] ?? []
  const clips = longToShortClipsBySourceId[sourceId] ?? []
  const firstCandidate = candidates.find((candidate) => candidate.status !== "REJECTED")

  if (firstCandidate) {
    return {
      id: firstCandidate.id,
      kind: "candidate",
    }
  }

  if (clips[0]) {
    return {
      id: clips[0].id,
      kind: "clip",
    }
  }

  return null
}

export function LongToShortWorkspace() {
  const [selectedSourceId, setSelectedSourceId] = useState(longToShortSources[0]?.id ?? "")
  const [settings, setSettings] = useState<LongToShortSettings>(defaultLongToShortSettings)
  const [candidatesBySource, setCandidatesBySource] = useState(longToShortCandidatesBySourceId)
  const [clipsBySource, setClipsBySource] = useState(longToShortClipsBySourceId)
  const [jobsBySource, setJobsBySource] = useState(longToShortJobsBySourceId)
  const [selectedItem, setSelectedItem] = useState<SelectedWorkspaceItem>(() =>
    getInitialSelection(longToShortSources[0]?.id ?? "")
  )

  const selectedSource =
    longToShortSources.find((source) => source.id === selectedSourceId) ?? longToShortSources[0]
  const sourceCandidates = selectedSource ? candidatesBySource[selectedSource.id] ?? [] : []
  const sourceClips = selectedSource ? clipsBySource[selectedSource.id] ?? [] : []
  const currentJob = selectedSource ? jobsBySource[selectedSource.id] : null
  const selectedCandidate =
    selectedItem?.kind === "candidate"
      ? sourceCandidates.find((candidate) => candidate.id === selectedItem.id) ?? null
      : null
  const selectedClip =
    selectedItem?.kind === "clip"
      ? sourceClips.find((clip) => clip.id === selectedItem.id) ?? null
      : null
  const activeCandidate =
    selectedCandidate ??
    (selectedClip?.sourceCandidateId
      ? sourceCandidates.find((candidate) => candidate.id === selectedClip.sourceCandidateId) ?? null
      : null)
  const activeItem = selectedClip ?? selectedCandidate

  const switchSource = (sourceId: string) => {
    setSelectedSourceId(sourceId)
    setSelectedItem(getInitialSelection(sourceId))
  }

  const updateCandidate = (
    candidateId: string,
    updater: (candidate: LongToShortCandidate) => LongToShortCandidate
  ) => {
    setCandidatesBySource((currentState) => ({
      ...currentState,
      [selectedSourceId]: (currentState[selectedSourceId] ?? []).map((candidate) =>
        candidate.id === candidateId ? updater(candidate) : candidate
      ),
    }))
  }

  const updateClip = (
    clipId: string,
    updater: (clip: LongToShortClip) => LongToShortClip
  ) => {
    setClipsBySource((currentState) => ({
      ...currentState,
      [selectedSourceId]: (currentState[selectedSourceId] ?? []).map((clip) =>
        clip.id === clipId ? updater(clip) : clip
      ),
    }))
  }

  const createDraftFromCandidate = (candidate: LongToShortCandidate) => {
    const existingClip = sourceClips.find((clip) => clip.sourceCandidateId === candidate.id)
    const nextClipId = existingClip?.id ?? `clip_${candidate.id}`
    const nextClip: LongToShortClip = {
      id: nextClipId,
      sourceId: candidate.sourceId,
      sourceCandidateId: candidate.id,
      title: candidate.title,
      caption: candidate.caption,
      startTime: candidate.startTime,
      endTime: candidate.endTime,
      duration: candidate.duration,
      status: "DRAFT",
      aspectRatio: candidate.aspectRatio,
      platform: candidate.platform,
      burnSubtitles: candidate.burnSubtitles,
      updatedAtLabel: "Updated just now",
    }

    updateCandidate(candidate.id, (currentCandidate) => ({
      ...currentCandidate,
      status: "SELECTED",
    }))
    setClipsBySource((currentState) => ({
      ...currentState,
      [selectedSourceId]: existingClip
        ? (currentState[selectedSourceId] ?? []).map((clip) =>
            clip.id === existingClip.id ? nextClip : clip
          )
        : [nextClip, ...(currentState[selectedSourceId] ?? [])],
    }))
    setSelectedItem({
      id: nextClipId,
      kind: "clip",
    })
  }

  if (!selectedSource) {
    return null
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 py-6 lg:gap-10">
      <section className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-[var(--shadow-panel)]">
        <div className="flex flex-col gap-6 px-5 py-6 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8 lg:py-7">
          <div className="space-y-3">
            <span className="inline-flex items-center rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground-subtle">
              Creator workflow
            </span>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold leading-tight text-foreground sm:text-[2rem]">
                Long to Short
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-[15px]">
                Generate short-form moments from one source recording, review the
                strongest candidates, and push clean drafts toward publishing.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="lg"
              onClick={() =>
                setJobsBySource((currentState) => ({
                  ...currentState,
                  [selectedSource.id]: {
                    sourceId: selectedSource.id,
                    status: "RUNNING",
                    progress: 28,
                    currentStep: "Refreshing chapter-aware candidates",
                  },
                }))
              }
            >
              <WandSparkles className="size-4" />
              Generate clips
            </Button>
            <Button size="lg" asChild>
              <Link href={`/editor/${selectedSource.projectSlug}`}>
                <PlayCircle className="size-4" />
                Open Studio
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <div className="rounded-xl border border-border/70 bg-card px-5 py-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Source media</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Pick the long-form recording you want to mine for short clips.
              </p>
            </div>
            <Badge variant="neutral">{longToShortSources.length}</Badge>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {longToShortSources.map((source) => {
              const isSelected = source.id === selectedSource.id
              const statusBadge = getSourceStatusBadge(source.status)
              const SourceIcon =
                source.type === "VIDEO" ? Clapperboard : AudioWaveform

              return (
                <button
                  key={source.id}
                  type="button"
                  onClick={() => switchSource(source.id)}
                  className={cn(
                    "rounded-xl border px-4 py-4 text-left transition",
                    isSelected
                      ? "border-sky-500/50 bg-sky-500/8 shadow-[0_0_0_1px_rgba(14,165,233,0.18)]"
                      : "border-border bg-background hover:border-foreground/18 hover:bg-muted/35"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex size-10 items-center justify-center rounded-lg border border-border bg-muted text-foreground">
                      <SourceIcon className="size-4" />
                    </span>
                    <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                  </div>

                  <p className="mt-4 text-sm font-medium text-foreground">{source.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{source.sourceFileName}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{source.durationLabel}</span>
                    <span className="text-border">•</span>
                    <span>{source.transcriptStatus === "READY" ? "Transcript ready" : "No transcript"}</span>
                    <span className="text-border">•</span>
                    <span>{source.chapterStatus === "READY" ? "Chapters ready" : "No chapters"}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <section className="rounded-xl border border-border/70 bg-card px-5 py-5 shadow-[var(--shadow-card)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Generation status</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Current job progress for the selected source.
              </p>
            </div>
            {currentJob ? (
              <Badge variant={getJobBadge(currentJob.status).variant}>
                {getJobBadge(currentJob.status).label}
              </Badge>
            ) : null}
          </div>

          {currentJob ? (
            <>
              <p className="mt-4 text-sm font-medium text-foreground">
                {currentJob.currentStep}
              </p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-sky-500 transition-[width]"
                  style={{ width: `${currentJob.progress}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {currentJob.progress}% complete
              </p>
            </>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-2">
            <Badge variant={selectedSource.transcriptStatus === "READY" ? "success" : "warning"}>
              {selectedSource.transcriptStatus === "READY"
                ? "Transcript ready"
                : "Transcript needed"}
            </Badge>
            <Badge variant={selectedSource.chapterStatus === "READY" ? "success" : "warning"}>
              {selectedSource.chapterStatus === "READY" ? "Chapters ready" : "Chapters missing"}
            </Badge>
          </div>
        </section>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(320px,0.85fr)_minmax(0,1.15fr)]">
        <section className="rounded-xl border border-border/70 bg-card px-5 py-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">AI suggestions</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Review the strongest short-form candidates for the selected source.
              </p>
            </div>
            <Badge variant="neutral">{sourceCandidates.length}</Badge>
          </div>

          <div className="mt-4 space-y-2">
            {sourceCandidates.map((candidate) => {
              const isSelected =
                selectedItem?.kind === "candidate" && selectedItem.id === candidate.id
              const statusBadge = getCandidateBadge(candidate.status, candidate.isOutdated)

              return (
                <button
                  key={candidate.id}
                  type="button"
                  onClick={() =>
                    setSelectedItem({
                      id: candidate.id,
                      kind: "candidate",
                    })
                  }
                  className={cn(
                    "w-full rounded-xl border px-3 py-3 text-left transition",
                    isSelected
                      ? "border-sky-500/50 bg-sky-500/8 shadow-[0_0_0_1px_rgba(14,165,233,0.18)]"
                      : "border-border bg-background hover:border-foreground/18 hover:bg-muted/35"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {candidate.title}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {getRangeLabel(candidate.startTime, candidate.endTime)} · {Math.round(candidate.duration)}s
                      </p>
                    </div>
                    <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {candidate.reviewNotes.slice(0, 2).map((note) => (
                      <Badge key={note} variant="neutral">
                        {note}
                      </Badge>
                    ))}
                  </div>

                  <p className="mt-3 max-h-10 overflow-hidden text-xs leading-5 text-muted-foreground">
                    {candidate.transcript}
                  </p>

                  {candidate.sourceChapterLabel ? (
                    <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                      From {candidate.sourceChapterLabel}
                    </p>
                  ) : null}
                </button>
              )
            })}
          </div>
        </section>

        <section className="rounded-xl border border-border/70 bg-card px-5 py-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Review and trim</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Tighten the selected moment before saving it as a short-form draft.
              </p>
            </div>
            {activeItem ? (
              <Badge variant={selectedClip ? getClipBadge(selectedClip.status).variant : "neutral"}>
                {selectedClip ? getClipBadge(selectedClip.status).label : "Suggestion"}
              </Badge>
            ) : null}
          </div>

          {activeItem ? (
            <div className="mt-5 space-y-5">
              <section className="rounded-xl border border-border bg-background/80 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="info">
                    {activeItem.aspectRatio}
                  </Badge>
                  <Badge variant="neutral">
                    {getPlatformLabel(activeItem.platform)}
                  </Badge>
                  {activeCandidate?.isOutdated ? (
                    <Badge variant="warning">{activeCandidate.transcriptVersionLabel}</Badge>
                  ) : null}
                </div>
                <p className="mt-3 text-sm font-medium text-foreground">
                  {activeItem.title}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {getRangeLabel(activeItem.startTime, activeItem.endTime)} · {Math.round(activeItem.duration)}s
                </p>
              </section>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Title</span>
                  <Input
                    value={activeItem.title}
                    onChange={(event) => {
                      const nextTitle = event.target.value

                      if (selectedClip) {
                        updateClip(selectedClip.id, (clip) => ({
                          ...clip,
                          title: nextTitle,
                        }))
                        return
                      }

                      if (selectedCandidate) {
                        updateCandidate(selectedCandidate.id, (candidate) => ({
                          ...candidate,
                          title: nextTitle,
                        }))
                      }
                    }}
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="grid gap-2">
                    <span className="text-xs font-medium text-muted-foreground">Start</span>
                    <Input
                      type="number"
                      value={activeItem.startTime}
                      min={0}
                      max={Math.max(0, activeItem.endTime - 1)}
                      onChange={(event) => {
                        const nextStart = Number(event.target.value)

                        if (!Number.isFinite(nextStart)) {
                          return
                        }

                        if (selectedClip) {
                          updateClip(selectedClip.id, (clip) => {
                            const startTime = Math.min(Math.max(0, nextStart), clip.endTime - 1)
                            const duration = Number((clip.endTime - startTime).toFixed(2))

                            return { ...clip, startTime, duration }
                          })
                          return
                        }

                        if (selectedCandidate) {
                          updateCandidate(selectedCandidate.id, (candidate) => {
                            const startTime = Math.min(
                              Math.max(0, nextStart),
                              candidate.endTime - 1
                            )
                            const duration = Number((candidate.endTime - startTime).toFixed(2))

                            return { ...candidate, startTime, duration }
                          })
                        }
                      }}
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-xs font-medium text-muted-foreground">End</span>
                    <Input
                      type="number"
                      value={activeItem.endTime}
                      min={activeItem.startTime + 1}
                      onChange={(event) => {
                        const nextEnd = Number(event.target.value)

                        if (!Number.isFinite(nextEnd)) {
                          return
                        }

                        if (selectedClip) {
                          updateClip(selectedClip.id, (clip) => {
                            const endTime = Math.max(clip.startTime + 1, nextEnd)
                            const duration = Number((endTime - clip.startTime).toFixed(2))

                            return { ...clip, endTime, duration }
                          })
                          return
                        }

                        if (selectedCandidate) {
                          updateCandidate(selectedCandidate.id, (candidate) => {
                            const endTime = Math.max(candidate.startTime + 1, nextEnd)
                            const duration = Number((endTime - candidate.startTime).toFixed(2))

                            return { ...candidate, endTime, duration }
                          })
                        }
                      }}
                    />
                  </label>
                </div>
              </div>

              <label className="grid gap-2">
                <span className="text-xs font-medium text-muted-foreground">Caption</span>
                <textarea
                  value={activeItem.caption}
                  onChange={(event) => {
                    const nextCaption = event.target.value

                    if (selectedClip) {
                      updateClip(selectedClip.id, (clip) => ({
                        ...clip,
                        caption: nextCaption,
                      }))
                      return
                    }

                    if (selectedCandidate) {
                      updateCandidate(selectedCandidate.id, (candidate) => ({
                        ...candidate,
                        caption: nextCaption,
                      }))
                    }
                  }}
                  className="min-h-24 resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/30"
                />
              </label>

              <section className="rounded-xl border border-border bg-background/80 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                  Transcript preview
                </p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {activeCandidate?.transcript ?? "This draft is already using the selected clip copy."}
                </p>
              </section>

              {activeCandidate ? (
                <section className="rounded-xl border border-border bg-background/80 p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    Why this moment
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {activeCandidate.reviewNotes.map((note) => (
                      <Badge key={note} variant="neutral">
                        {note}
                      </Badge>
                    ))}
                  </div>
                </section>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground">Aspect ratio</span>
                  <div className="grid grid-cols-3 gap-2">
                    {(["9:16", "1:1", "16:9"] as const).map((aspectRatio) => (
                      <Button
                        key={aspectRatio}
                        type="button"
                        variant={activeItem.aspectRatio === aspectRatio ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          if (selectedClip) {
                            updateClip(selectedClip.id, (clip) => ({
                              ...clip,
                              aspectRatio,
                            }))
                            return
                          }

                          if (selectedCandidate) {
                            updateCandidate(selectedCandidate.id, (candidate) => ({
                              ...candidate,
                              aspectRatio,
                            }))
                          }
                        }}
                      >
                        {aspectRatio}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-medium text-muted-foreground">Subtitles</span>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={activeItem.burnSubtitles ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        if (selectedClip) {
                          updateClip(selectedClip.id, (clip) => ({
                            ...clip,
                            burnSubtitles: true,
                          }))
                          return
                        }

                        if (selectedCandidate) {
                          updateCandidate(selectedCandidate.id, (candidate) => ({
                            ...candidate,
                            burnSubtitles: true,
                          }))
                        }
                      }}
                    >
                      Burn-in
                    </Button>
                    <Button
                      type="button"
                      variant={activeItem.burnSubtitles ? "outline" : "default"}
                      size="sm"
                      onClick={() => {
                        if (selectedClip) {
                          updateClip(selectedClip.id, (clip) => ({
                            ...clip,
                            burnSubtitles: false,
                          }))
                          return
                        }

                        if (selectedCandidate) {
                          updateCandidate(selectedCandidate.id, (candidate) => ({
                            ...candidate,
                            burnSubtitles: false,
                          }))
                        }
                      }}
                    >
                      Off
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground">Platform</span>
                <div className="grid gap-2 md:grid-cols-3">
                  {(
                    [
                      "TIKTOK",
                      "YOUTUBE_SHORTS",
                      "INSTAGRAM_REELS",
                    ] as const
                  ).map((platform) => (
                    <Button
                      key={platform}
                      type="button"
                      variant={activeItem.platform === platform ? "default" : "outline"}
                      size="sm"
                      className="justify-start"
                      onClick={() => {
                        if (selectedClip) {
                          updateClip(selectedClip.id, (clip) => ({
                            ...clip,
                            platform,
                          }))
                          return
                        }

                        if (selectedCandidate) {
                          updateCandidate(selectedCandidate.id, (candidate) => ({
                            ...candidate,
                            platform,
                          }))
                        }
                      }}
                    >
                      {getPlatformLabel(platform)}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedCandidate ? (
                  <>
                    <Button
                      type="button"
                      onClick={() =>
                        updateCandidate(selectedCandidate.id, (candidate) => ({
                          ...candidate,
                          status: "SELECTED",
                        }))
                      }
                    >
                      Use this clip
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => createDraftFromCandidate(selectedCandidate)}
                    >
                      Create draft
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() =>
                        updateCandidate(selectedCandidate.id, (candidate) => ({
                          ...candidate,
                          status: "REJECTED",
                        }))
                      }
                    >
                      Reject
                    </Button>
                  </>
                ) : null}

                {selectedClip ? (
                  <>
                    <Button
                      type="button"
                      onClick={() =>
                        updateClip(selectedClip.id, (clip) => ({
                          ...clip,
                          status: "READY",
                          updatedAtLabel: "Updated just now",
                        }))
                      }
                    >
                      Mark ready
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        updateClip(selectedClip.id, (clip) => ({
                          ...clip,
                          status: "DRAFT",
                          updatedAtLabel: "Updated just now",
                        }))
                      }
                    >
                      Regenerate
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-border bg-background/60 px-4 py-8 text-sm text-muted-foreground">
              Select a suggestion or output clip to review it here.
            </div>
          )}
        </section>
      </section>

      <section className="rounded-xl border border-border/70 bg-card px-5 py-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Rendered outputs</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Keep draft and ready clips together before handing them to publishing.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <label className="grid w-20 gap-1">
              <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                Count
              </span>
              <Input
                type="number"
                value={settings.clipCount}
                min={1}
                max={8}
                onChange={(event) =>
                  setSettings((currentSettings) => ({
                    ...currentSettings,
                    clipCount: Math.min(8, Math.max(1, Number(event.target.value) || 1)),
                  }))
                }
              />
            </label>
            <label className="grid w-24 gap-1">
              <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                Min sec
              </span>
              <Input
                type="number"
                value={settings.minDuration}
                min={10}
                max={90}
                onChange={(event) =>
                  setSettings((currentSettings) => ({
                    ...currentSettings,
                    minDuration: Math.max(10, Number(event.target.value) || 10),
                  }))
                }
              />
            </label>
            <label className="grid w-24 gap-1">
              <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                Max sec
              </span>
              <Input
                type="number"
                value={settings.maxDuration}
                min={15}
                max={120}
                onChange={(event) =>
                  setSettings((currentSettings) => ({
                    ...currentSettings,
                    maxDuration: Math.max(currentSettings.minDuration + 1, Number(event.target.value) || currentSettings.maxDuration),
                  }))
                }
              />
            </label>
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {sourceClips.map((clip) => {
            const isSelected = selectedItem?.kind === "clip" && selectedItem.id === clip.id
            const statusBadge = getClipBadge(clip.status)

            return (
              <button
                key={clip.id}
                type="button"
                onClick={() =>
                  setSelectedItem({
                    id: clip.id,
                    kind: "clip",
                  })
                }
                className={cn(
                  "rounded-xl border px-4 py-4 text-left transition",
                  isSelected
                    ? "border-sky-500/50 bg-sky-500/8 shadow-[0_0_0_1px_rgba(14,165,233,0.18)]"
                    : "border-border bg-background hover:border-foreground/18 hover:bg-muted/35"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{clip.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {clip.aspectRatio} · {getPlatformLabel(clip.platform)}
                    </p>
                  </div>
                  <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                </div>

                <p className="mt-3 max-h-10 overflow-hidden text-xs leading-5 text-muted-foreground">
                  {clip.caption}
                </p>

                <div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>{clip.updatedAtLabel}</span>
                  <span>{Math.round(clip.duration)}s</span>
                </div>
              </button>
            )
          })}
        </div>

        {sourceClips.length < 1 ? (
          <div className="mt-5 rounded-xl border border-dashed border-border bg-background/60 px-4 py-8 text-sm text-muted-foreground">
            Draft clips will show up here after you select a suggestion and create a draft.
          </div>
        ) : null}
      </section>
    </div>
  )
}
