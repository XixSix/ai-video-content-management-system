"use client"

import Link from "next/link"
import Image from "next/image"
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import {
  Clapperboard,
  Copy,
  Download,
  Edit3,
  AlertCircle,
  Loader2,
  Maximize2,
  MoreHorizontal,
  Play,
  Pause,
  Send,
  Share2,
  SkipBack,
  SkipForward,
  Sparkles,
  Volume2,
  VolumeX,
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
import { getMediaWaveformAssetUrl } from "@/features/media-library/lib/media-previews"
import { useAudioPeaks } from "@/features/studio-editor/timeline/hooks/use-audio-peaks"
import { TimelineWaveform } from "@/features/studio-editor/timeline/components/waveform"
import type {
  MediaDetailResponseData,
  MediaLibraryItem,
  MediaLibraryTab,
} from "../types/media-library.types"

type MediaLibraryPreviewDialogProps = {
  item: MediaLibraryItem | null
  activeTab: MediaLibraryTab
  candidates: LongToShortCandidate[]
  hasNextItem?: boolean
  hasPreviousItem?: boolean
  open: boolean
  onNextItem?: () => void
  onCreateClips?: () => void
  onDownload?: () => void
  onOpenEditor?: () => void
  onOpenChange: (open: boolean) => void
  onPreviousItem?: () => void
  previewDetail?: MediaDetailResponseData | null
  previewError?: string | null
  previewLoading?: boolean
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

function TranscriptAssetPreview({
  assetUrl,
  title,
}: {
  assetUrl: string
  title: string
}) {
  const [content, setContent] = useState("Loading transcript preview...")

  useEffect(() => {
    let isActive = true

    fetch(assetUrl)
      .then((response) => (response.ok ? response.text() : "Unable to load transcript."))
      .then((text) => {
        if (isActive) {
          setContent(text)
        }
      })
      .catch(() => {
        if (isActive) {
          setContent("Unable to load transcript.")
        }
      })

    return () => {
      isActive = false
    }
  }, [assetUrl])

  return (
    <div className="mx-auto flex aspect-video max-h-[min(58vh,34rem)] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-border/70 bg-background shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
      <div className="border-b border-border/70 px-4 py-3">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">Transcript text preview</p>
      </div>
      <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap p-4 text-sm leading-6 text-foreground-subtle">
        {content}
      </pre>
    </div>
  )
}

function NativeAssetPreview({
  item,
  previewDetail,
}: {
  item: MediaLibraryItem
  previewDetail?: MediaDetailResponseData | null
}) {
  const waveformPeaks = useAudioPeaks(
    item.type === "AUDIO" && previewDetail
      ? getMediaWaveformAssetUrl(previewDetail)
      : null
  )

  if (!item.assetUrl) {
    return null
  }

  if (item.type === "VIDEO") {
    const isVertical =
      typeof item.width === "number" &&
      typeof item.height === "number" &&
      item.height > item.width

    return (
      <video
        src={item.assetUrl}
        controls
        playsInline
        preload="metadata"
        poster={item.thumbnailUrl ?? undefined}
        className={cn(
          "mx-auto rounded-xl bg-black shadow-[0_24px_80px_rgba(0,0,0,0.28)]",
          isVertical
            ? "aspect-[9/16] max-h-[min(58vh,34rem)] max-w-[19rem]"
            : "aspect-video max-h-[min(58vh,34rem)] w-full max-w-4xl"
        )}
      />
    )
  }

  if (item.type === "AUDIO") {
    return (
      <div className="mx-auto flex aspect-video max-h-[min(58vh,34rem)] w-full max-w-4xl flex-col items-center justify-center gap-5 rounded-xl border border-border/70 bg-card p-6 shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
        <div className="space-y-1 text-center">
          <p className="text-base font-semibold text-foreground">{item.title}</p>
          <p className="text-sm text-muted-foreground">{item.originalFilename}</p>
        </div>
        <div className="h-28 w-full max-w-2xl overflow-hidden rounded-xl border border-border/70 bg-surface-muted px-3 py-2">
          <TimelineWaveform
            className="bg-cyan-600/55 dark:bg-cyan-100/45"
            peaks={waveformPeaks}
          />
        </div>
        <audio src={item.assetUrl} controls preload="metadata" className="w-full max-w-2xl" />
      </div>
    )
  }

  if (item.type === "IMAGE") {
    const isVertical =
      typeof item.width === "number" &&
      typeof item.height === "number" &&
      item.height > item.width

    return (
      <Image
        src={item.assetUrl}
        alt={item.title}
        width={item.width ?? 1600}
        height={item.height ?? 900}
        loading="eager"
        unoptimized
        className={cn(
          "mx-auto rounded-xl bg-black object-contain shadow-[0_24px_80px_rgba(0,0,0,0.2)]",
          isVertical
            ? "max-h-[min(58vh,34rem)] max-w-[19rem]"
            : "max-h-[min(58vh,34rem)] w-full max-w-4xl"
        )}
      />
    )
  }

  if (item.type === "TRANSCRIPT") {
    return <TranscriptAssetPreview assetUrl={item.assetUrl} title={item.title} />
  }

  return null
}

function CandidateNativeAssetPreview({
  candidate,
  item,
}: {
  candidate: LongToShortCandidate
  item: MediaLibraryItem
}) {
  if (!item.assetUrl) {
    return null
  }

  const mediaUrl = item.assetUrl

  if (item.type === "VIDEO") {
    const isVertical =
      typeof item.width === "number" &&
      typeof item.height === "number" &&
      item.height > item.width

    return (
      <video
        src={mediaUrl}
        controls
        playsInline
        preload="metadata"
        poster={item.thumbnailUrl ?? candidate.thumbnailUrl ?? undefined}
        className={cn(
          "mx-auto rounded-xl bg-black shadow-[0_24px_80px_rgba(0,0,0,0.28)]",
          isVertical
            ? "aspect-[9/16] max-h-[min(58vh,34rem)] max-w-[19rem]"
            : "aspect-video max-h-[min(58vh,34rem)] w-full max-w-4xl"
        )}
      />
    )
  }

  if (item.type === "AUDIO") {
    return (
      <div className="mx-auto flex aspect-video max-h-[min(58vh,34rem)] w-full max-w-4xl flex-col items-center justify-center gap-5 rounded-xl border border-border/70 bg-card p-6 shadow-[0_24px_80px_rgba(0,0,0,0.18)]">
        <div className="space-y-1 text-center">
          <p className="text-base font-semibold text-foreground">{candidate.title}</p>
          <p className="text-sm text-muted-foreground">
            {formatSecondsAsClock(candidate.startTime)}-{formatSecondsAsClock(candidate.endTime)}
          </p>
        </div>
        <audio src={mediaUrl} controls preload="metadata" className="w-full max-w-2xl" />
      </div>
    )
  }

  return null
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
  hasNextItem,
  hasPreviousItem,
  onNextItem,
  onPreviousItem,
  onToggleFullscreen,
}: {
  item: MediaLibraryItem
  candidate: LongToShortCandidate | null
  hasNextItem: boolean
  hasPreviousItem: boolean
  onNextItem: () => void
  onPreviousItem: () => void
  onToggleFullscreen: () => void
}) {
  const duration = candidate?.duration ?? item.duration
  const safeDuration = Math.max(0, duration ?? 0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speedIndex, setSpeedIndex] = useState(1)
  const speedOptions = [0.5, 1, 1.5, 2]
  const speed = speedOptions[speedIndex]
  const progress = safeDuration > 0 ? Math.min(100, (currentTime / safeDuration) * 100) : 0

  useEffect(() => {
    if (!isPlaying || safeDuration <= 0) {
      return
    }

    const intervalId = window.setInterval(() => {
      setCurrentTime((value) => {
        const nextValue = Math.min(safeDuration, value + 0.5 * speed)

        if (nextValue >= safeDuration) {
          setIsPlaying(false)
        }

        return nextValue
      })
    }, 500)

    return () => window.clearInterval(intervalId)
  }, [isPlaying, safeDuration, speed])

  return (
    <div className="rounded-xl border border-border/70 bg-card/95 p-3 shadow-[var(--shadow-card)]">
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-foreground transition-[width]"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            disabled={!hasPreviousItem}
            onClick={onPreviousItem}
          >
            <SkipBack className="size-4" />
            <span className="sr-only">Previous media</span>
          </Button>
          <Button
            type="button"
            size="icon-lg"
            className="rounded-full"
            onClick={() => setIsPlaying((value) => !value)}
          >
            {isPlaying ? (
              <Pause className="size-4 fill-current" />
            ) : (
              <Play className="ml-0.5 size-4 fill-current" />
            )}
            <span className="sr-only">
              {isPlaying ? "Pause preview" : "Play preview"}
            </span>
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            disabled={!hasNextItem}
            onClick={onNextItem}
          >
            <SkipForward className="size-4" />
            <span className="sr-only">Next media</span>
          </Button>
          <span className="text-xs font-medium text-muted-foreground">
            {formatSecondsAsClock(currentTime)} / {formatSecondsAsClock(duration)}
          </span>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-muted/70 p-1">
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={() => setIsMuted((value) => !value)}
          >
            {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
            <span className="sr-only">{isMuted ? "Unmute" : "Mute"}</span>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="min-w-10 px-2"
            onClick={() =>
              setSpeedIndex((value) => (value + 1) % speedOptions.length)
            }
          >
            {speed}x
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={onToggleFullscreen}
          >
            <Maximize2 className="size-4" />
            <span className="sr-only">Open fullscreen</span>
          </Button>
        </div>
      </div>
    </div>
  )
}

function MediaPlayerPanel({
  previewDetail,
  item,
  candidate,
  candidateIndex,
  hasNextItem,
  hasPreviousItem,
  onNextItem,
  onPreviousItem,
  previewError,
  previewLoading,
}: {
  previewDetail?: MediaDetailResponseData | null
  item: MediaLibraryItem
  candidate: LongToShortCandidate | null
  candidateIndex: number
  hasNextItem: boolean
  hasPreviousItem: boolean
  onNextItem: () => void
  onPreviousItem: () => void
  previewError?: string | null
  previewLoading?: boolean
}) {
  const playerPanelRef = useRef<HTMLElement | null>(null)
  const hasNativeAssetPreview = Boolean(item.assetUrl) && !candidate
  const hasCandidateNativeAssetPreview =
    Boolean(item.assetUrl) && Boolean(candidate) && (item.type === "VIDEO" || item.type === "AUDIO")

  const toggleFullscreen = () => {
    const panel = playerPanelRef.current

    if (!panel) {
      return
    }

    if (document.fullscreenElement) {
      void document.exitFullscreen()
      return
    }

    void panel.requestFullscreen()
  }

  return (
    <section
      ref={playerPanelRef}
      className="flex min-h-0 flex-col gap-3 border-b border-border/70 bg-black/[0.03] p-4 dark:bg-black/25 lg:border-b-0 lg:border-r"
    >
      <div className="flex min-h-0 flex-1 items-center justify-center">
        {previewLoading ? (
          <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
            Preparing secure preview…
          </div>
        ) : previewError ? (
          <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-center">
            <AlertCircle className="size-7 text-destructive" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                Preview unavailable
              </p>
              <p className="text-xs leading-5 text-muted-foreground">
                {previewError}
              </p>
            </div>
          </div>
        ) : candidate && hasCandidateNativeAssetPreview ? (
          <CandidateNativeAssetPreview item={item} candidate={candidate} />
        ) : hasNativeAssetPreview ? (
          <NativeAssetPreview item={item} previewDetail={previewDetail} />
        ) : (
          <PreviewPoster
            item={item}
            candidate={candidate}
            candidateIndex={candidateIndex}
          />
        )}
      </div>
      {hasNativeAssetPreview || hasCandidateNativeAssetPreview ? (
        <div className="flex items-center justify-between rounded-xl border border-border/70 bg-card/95 p-3 shadow-[var(--shadow-card)]">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="min-w-24 justify-start gap-1.5 px-2 text-xs leading-none"
            disabled={!hasPreviousItem}
            onClick={onPreviousItem}
          >
            <SkipBack className="size-4 shrink-0" />
            <span className="leading-none">Previous</span>
          </Button>
          <span className="truncate px-3 text-xs font-medium text-muted-foreground">
            {item.assetUrl ? "Native media controls are available in the preview." : null}
          </span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="min-w-24 justify-end gap-1.5 px-2 text-xs leading-none"
            disabled={!hasNextItem}
            onClick={onNextItem}
          >
            <span className="leading-none">Next</span>
            <SkipForward className="size-4 shrink-0" />
          </Button>
        </div>
      ) : (
        <PlayerControls
          key={`${item.id}-${candidate?.id ?? "source"}`}
          item={item}
          candidate={candidate}
          hasNextItem={hasNextItem}
          hasPreviousItem={hasPreviousItem}
          onNextItem={onNextItem}
          onPreviousItem={onPreviousItem}
          onToggleFullscreen={toggleFullscreen}
        />
      )}
    </section>
  )
}

function ContextPanel({
  activeTab,
  candidate,
}: {
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

  return null
}

function ActionRail({
  isLongToShort,
  onCreateClips,
  onDownload,
  onOpenEditor,
}: {
  isLongToShort: boolean
  onCreateClips?: () => void
  onDownload?: () => void
  onOpenEditor?: () => void
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
        { label: "Open Editor", icon: Clapperboard },
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
          const isDisabled =
            (action.label === "Open Editor" && !onOpenEditor) ||
            (action.label === "Create clips" && !onCreateClips) ||
            (action.label === "Download" && !onDownload)
          const button = (
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              className="rounded-xl"
              asChild={Boolean(action.href)}
              disabled={!action.href && isDisabled}
              onClick={
                action.label === "Download"
                  ? onDownload
                  : action.label === "Open Editor"
                    ? onOpenEditor
                    : action.label === "Create clips"
                      ? onCreateClips
                      : undefined
              }
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
      <div className="mb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Next clips
          </p>
          <p className="text-sm font-semibold text-foreground">
            {candidates.length} candidates
          </p>
        </div>
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
                  "relative aspect-video self-center overflow-hidden rounded-lg border border-white/10 bg-cover bg-center",
                  candidate.thumbnailUrl ? "bg-black" : getPreviewBackground(index)
                )}
                style={
                  candidate.thumbnailUrl
                    ? { backgroundImage: `url(${candidate.thumbnailUrl})` }
                    : undefined
                }
              >
                <div
                  className={cn(
                    "absolute inset-0",
                    candidate.thumbnailUrl
                      ? "bg-[linear-gradient(180deg,rgba(0,0,0,0.04),rgba(0,0,0,0.62))]"
                      : "bg-[radial-gradient(circle_at_35%_22%,rgba(255,255,255,0.26),transparent_28%)]"
                  )}
                />
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
  hasNextItem = false,
  hasPreviousItem = false,
  open,
  onNextItem,
  onCreateClips,
  onDownload,
  onOpenEditor,
  onOpenChange,
  onPreviousItem,
  previewDetail,
  previewError,
  previewLoading,
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
              : "lg:grid-cols-[minmax(20rem,1fr)_4.5rem]"
          )}
        >
          <MediaPlayerPanel
            item={item}
            candidate={selectedCandidate}
            candidateIndex={selectedCandidateIndex}
            hasNextItem={hasNextItem}
            hasPreviousItem={hasPreviousItem}
            onNextItem={onNextItem ?? (() => undefined)}
            onPreviousItem={onPreviousItem ?? (() => undefined)}
            previewDetail={previewDetail}
            previewError={previewError}
            previewLoading={previewLoading}
          />
          <ContextPanel
            activeTab={activeTab}
            candidate={selectedCandidate}
          />
          <ActionRail
            isLongToShort={isLongToShortPreview}
            onCreateClips={onCreateClips}
            onDownload={onDownload}
            onOpenEditor={onOpenEditor}
          />
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
