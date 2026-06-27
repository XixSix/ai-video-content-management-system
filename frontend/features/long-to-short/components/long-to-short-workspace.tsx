"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  ArrowRight,
  AudioLines,
  Ban,
  ChevronsUpDown,
  CheckCircle2,
  CircleDashed,
  Clapperboard,
  Plus,
  Play,
  Search,
  SlidersHorizontal,
  Sparkles,
  UploadCloud,
  WandSparkles,
  X,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  defaultLongToShortSettings,
  longToShortCaptionPresets,
  longToShortClipLengthOptions,
  longToShortClipModelOptions,
  longToShortGenreOptions,
  longToShortSpeechLanguageOptions,
} from "@/features/long-to-short/long-to-short.data"
import type {
  LongToShortCaptionPreset,
  LongToShortCandidate,
  LongToShortSettings,
  LongToShortSource,
} from "@/features/long-to-short/long-to-short.types"
import { jobService, isTerminalJob } from "@/features/jobs/job.service"
import type { ProcessingJobData } from "@/features/jobs/job.types"
import { useMediaDetail } from "@/features/media-library/hooks/use-media-detail"
import { useMediaList } from "@/features/media-library/hooks/use-media-list"
import { getMediaPreviewThumbnailUrl } from "@/features/media-library/lib/media-previews"
import type {
  MediaDetailResponseData,
  MediaLibraryItem,
} from "@/features/media-library/types/media-library.types"
import type {
  ClipCandidateData,
  GenerateShortClipsPreferences,
  ShortClipData,
} from "@/features/short-clips/short-clips.types"
import {
  useClipCandidates,
  useGenerateShortClips,
  useShortClipDownloadUrls,
  useShortClips,
} from "@/features/short-clips/use-short-clips"
import { useWorkspace } from "@/features/workspaces/components/workspace-provider"
import { cn } from "@/lib/utils"

type RunState = "IDLE" | "GENERATING" | "COMPLETED"
type WorkspaceView = "SETUP" | "RESULTS"
type LongToShortNotification = {
  id: string
  status: "PROCESSING" | "SUCCESS"
  title: string
  description: string
}
type SelectOption = {
  label: string
  value: string
}

function formatSecondsAsClock(totalSeconds: number) {
  const safeValue = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(safeValue / 3600)
  const minutes = Math.floor((safeValue % 3600) / 60)
  const seconds = safeValue % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
}

function getPlatformLabel(platform: LongToShortCandidate["platform"]) {
  if (platform === "YOUTUBE_SHORTS") {
    return "YouTube Shorts"
  }

  if (platform === "INSTAGRAM_REELS") {
    return "Instagram Reels"
  }

  return "TikTok"
}

function getTimeRangeLabel(candidate: LongToShortCandidate) {
  return `${formatSecondsAsClock(candidate.startTime)}-${formatSecondsAsClock(candidate.endTime)}`
}

function getAspectClass(aspectRatio: LongToShortSettings["aspectRatio"]) {
  if (aspectRatio === "16:9") {
    return "aspect-video"
  }

  if (aspectRatio === "1:1") {
    return "aspect-square"
  }

  return "aspect-[9/16]"
}

function getPresetToneClasses(tone: LongToShortCaptionPreset["tone"]) {
  if (tone === "lime") {
    return {
      primary: "text-lime-400",
      secondary: "text-white",
      frame:
        "border-lime-500/25 bg-[linear-gradient(180deg,rgba(20,25,18,0.88),rgba(10,12,10,0.96))]",
    }
  }

  if (tone === "amber") {
    return {
      primary: "text-amber-300",
      secondary: "text-white",
      frame:
        "border-amber-500/25 bg-[linear-gradient(180deg,rgba(28,22,14,0.88),rgba(11,10,8,0.96))]",
    }
  }

  if (tone === "violet") {
    return {
      primary: "text-fuchsia-300",
      secondary: "text-violet-100",
      frame:
        "border-fuchsia-500/25 bg-[linear-gradient(180deg,rgba(25,17,32,0.9),rgba(10,9,13,0.98))]",
    }
  }

  return {
    primary: "text-zinc-900 dark:text-zinc-50",
    secondary: "text-zinc-500 dark:text-zinc-400",
    frame:
      "border-border bg-[linear-gradient(180deg,rgba(240,240,242,0.92),rgba(218,218,222,0.96))] dark:bg-[linear-gradient(180deg,rgba(28,28,30,0.92),rgba(16,16,18,0.98))]",
  }
}

function buildMediaSource(media: MediaDetailResponseData): LongToShortSource {
  const durationSeconds = media.duration ?? 0
  const title = media.title ?? media.originalFilename

  return {
    id: media.id,
    projectSlug: media.id,
    title,
    sourceFileName: media.originalFilename,
    assetUrl: null,
    thumbnailUrl: getMediaPreviewThumbnailUrl(media),
    type: media.type === "AUDIO" ? "AUDIO" : "VIDEO",
    durationSeconds,
    durationLabel: formatSecondsAsClock(durationSeconds),
    resolutionLabel:
      media.width && media.height
        ? `${media.width} x ${media.height}`
        : media.type === "AUDIO"
          ? "Audio only"
          : "Source video",
    transcriptStatus: "READY",
    chapterStatus: "READY",
    status: media.status === "UPLOADED" ? "READY" : "PROCESSING",
  }
}

function buildMediaLibrarySource(item: MediaLibraryItem): LongToShortSource {
  const durationSeconds = item.duration ?? 0

  return {
    id: item.id,
    projectSlug: item.id,
    title: item.title,
    sourceFileName: item.originalFilename,
    assetUrl: item.assetUrl,
    thumbnailUrl: item.thumbnailUrl,
    type: item.type === "AUDIO" ? "AUDIO" : "VIDEO",
    durationSeconds,
    durationLabel: formatSecondsAsClock(durationSeconds),
    resolutionLabel:
      item.width && item.height
        ? `${item.width} x ${item.height}`
        : item.type === "AUDIO"
          ? "Audio only"
          : "Source video",
    transcriptStatus: "READY",
    chapterStatus: "READY",
    status: item.status === "UPLOADED" ? "READY" : "PROCESSING",
  }
}

function getShortClipVideoAssetId(shortClip: ShortClipData | undefined) {
  return shortClip?.assets.find((asset) => asset.assetType === "SHORT_CLIP_VIDEO")?.id
}

function mapClipCandidate(
  candidate: ClipCandidateData,
  shortClip: ShortClipData | undefined,
  assetUrl: string | null
): LongToShortCandidate {
  const fallbackTitle =
    candidate.text?.split(/\s+/).slice(0, 8).join(" ") || "Generated clip candidate"

  return {
    id: candidate.id,
    sourceId: candidate.mediaId,
    shortClipId: shortClip?.id,
    generatedAssetId: getShortClipVideoAssetId(shortClip),
    assetUrl,
    sourceChapterLabel: candidate.chapterId ? "Generated chapter" : undefined,
    title: candidate.title ?? fallbackTitle,
    caption: candidate.text ?? "",
    thumbnailUrl: null,
    startTime: candidate.startTime,
    endTime: candidate.endTime,
    duration: candidate.duration,
    transcript: candidate.text ?? "",
    reviewNotes: [candidate.reason].filter((note): note is string => Boolean(note)),
    status:
      candidate.status === "SELECTED"
        ? "SELECTED"
        : candidate.status === "REJECTED"
          ? "REJECTED"
          : "RECOMMENDED",
    aspectRatio: "9:16",
    platform: "TIKTOK",
    burnSubtitles: true,
    transcriptVersionLabel: `Transcript v${candidate.transcriptVersion}`,
    shortClipStatus: shortClip?.status,
  }
}

function buildGenerationPreferences(
  settings: LongToShortSettings
): GenerateShortClipsPreferences {
  return {
    clipCount: 3,
    clipLength: settings.clipLength,
    aspectRatio: settings.aspectRatio,
    language: settings.speechLanguage,
    genre: settings.genre,
    clipModel: settings.clipModel,
    autoHook: settings.autoHook,
    prompt: settings.prompt,
    captionPresetId: settings.captionPresetId,
    burnSubtitle: settings.captionPresetId !== "no-caption",
  }
}

function InlineSelect({
  label,
  options,
  selectedLabel,
  value,
  onChange,
}: {
  label: string
  options: SelectOption[]
  selectedLabel?: string
  value: string
  onChange: (value: string) => void
}) {
  const activeLabel =
    selectedLabel ??
    options.find((option) => option.value === value)?.label ?? options[0]?.label ?? "Auto"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground transition hover:text-foreground"
        >
          <span>{label}</span>
          <span className="font-semibold text-foreground">{activeLabel}</span>
          <ChevronsUpDown className="size-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44 min-w-44">
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function PreviewMock({
  aspectRatio,
  preset,
  source,
}: {
  aspectRatio: LongToShortSettings["aspectRatio"]
  preset: LongToShortCaptionPreset
  source: LongToShortSource
}) {
  const presetTone = getPresetToneClasses(preset.tone)
  const previewStyle = source.thumbnailUrl
    ? { backgroundImage: `url(${source.thumbnailUrl})` }
    : undefined

  return (
    <div className="mx-auto w-[min(22rem,84vw)]">
      <div
        className={cn(
          "relative aspect-video overflow-hidden rounded-xl border border-border bg-[linear-gradient(135deg,rgba(18,29,38,0.96),rgba(8,12,18,0.98))] bg-cover bg-center shadow-[0_18px_40px_rgba(0,0,0,0.18)]",
          source.thumbnailUrl ? "bg-black" : null
        )}
        style={previewStyle}
      >
        <div className="absolute left-2 top-2 rounded-md bg-background/90 px-1.5 py-0.5 text-[10px] font-semibold text-foreground shadow-sm">
          {source.resolutionLabel === "Audio only" ? "AUDIO" : aspectRatio}
        </div>
        <div
          className={cn(
            "absolute inset-0",
            source.thumbnailUrl
              ? "bg-[linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.52))]"
              : "bg-[radial-gradient(circle_at_36%_34%,rgba(60,130,150,0.58),transparent_30%),radial-gradient(circle_at_72%_28%,rgba(180,92,55,0.45),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.07),transparent_45%)]"
          )}
        />
        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.62))]" />
        {!source.thumbnailUrl ? (
          <>
            <div className="absolute left-[12%] top-[28%] size-12 rounded-full border border-white/20 bg-white/12" />
            <div className="absolute right-[12%] top-[18%] h-16 w-24 rounded-xl border border-white/15 bg-white/10" />
          </>
        ) : null}

        {!preset.isNoCaption ? (
          <div className="absolute inset-x-[22%] bottom-2 rounded-md bg-black/70 px-2 py-1 text-center shadow-sm">
            <p className={cn("text-[10px] font-semibold leading-tight", presetTone.primary)}>
              {preset.samplePrimary}
            </p>
            <p className={cn("text-[10px] font-semibold leading-tight", presetTone.secondary)}>
              {preset.sampleSecondary}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function CandidateThumbnail({
  aspectRatio,
  candidate,
  index,
  preset,
  size = "card",
}: {
  aspectRatio: LongToShortSettings["aspectRatio"]
  candidate: LongToShortCandidate
  index: number
  preset: LongToShortCaptionPreset
  size?: "card" | "preview"
}) {
  const presetTone = getPresetToneClasses(preset.tone)
  const backgrounds = [
    "bg-[linear-gradient(155deg,rgba(11,52,64,0.98),rgba(14,18,27,0.98))]",
    "bg-[linear-gradient(155deg,rgba(64,32,22,0.98),rgba(13,14,18,0.98))]",
    "bg-[linear-gradient(155deg,rgba(45,36,78,0.98),rgba(12,12,18,0.98))]",
    "bg-[linear-gradient(155deg,rgba(27,57,38,0.98),rgba(11,14,12,0.98))]",
  ]
  const figurePositions = [
    "left-[18%] top-[24%]",
    "right-[18%] top-[18%]",
    "left-[28%] top-[20%]",
    "right-[24%] top-[25%]",
  ]
  const thumbnailStyle = candidate.thumbnailUrl
    ? { backgroundImage: `url(${candidate.thumbnailUrl})` }
    : undefined

  return (
    <div
      className={cn(
        "relative mx-auto w-full overflow-hidden rounded-xl border border-border/80 bg-cover bg-center shadow-[0_16px_40px_rgba(0,0,0,0.18)]",
        getAspectClass(aspectRatio),
        candidate.thumbnailUrl ? "bg-black" : backgrounds[index % backgrounds.length],
        size === "preview" ? "max-h-[70vh] max-w-[23rem]" : "max-w-[14rem]"
      )}
      style={thumbnailStyle}
    >
      <div className="absolute left-2 top-2 rounded-md bg-black/70 px-2 py-1 text-[10px] font-semibold text-white">
        {aspectRatio}
      </div>
      <div className="absolute right-2 top-2 rounded-md bg-black/70 px-2 py-1 text-[10px] font-semibold text-white">
        {formatSecondsAsClock(candidate.duration)}
      </div>

      <div
        className={cn(
          "absolute inset-0",
          candidate.thumbnailUrl
            ? "bg-[linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.7))]"
            : "bg-[radial-gradient(circle_at_38%_25%,rgba(255,255,255,0.22),transparent_26%),radial-gradient(circle_at_72%_18%,rgba(125,211,252,0.22),transparent_26%)]"
        )}
      />
      {!candidate.thumbnailUrl ? (
        <div
          className={cn(
            "absolute size-20 rounded-full border border-white/20 bg-white/15",
            figurePositions[index % figurePositions.length],
            size === "preview" ? "size-28" : "size-20"
          )}
        />
      ) : null}
      <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.72))]" />

      {!preset.isNoCaption ? (
        <div
          className={cn(
            "absolute inset-x-3 rounded-lg bg-black/72 px-2 py-1.5 text-center shadow-sm",
            size === "preview" ? "bottom-8" : "bottom-4"
          )}
        >
          <p
            className={cn(
              "font-semibold leading-tight",
              presetTone.primary,
              size === "preview" ? "text-sm" : "text-[11px]"
            )}
          >
            {candidate.title}
          </p>
          <p
            className={cn(
              "mt-1 font-semibold leading-tight",
              presetTone.secondary,
              size === "preview" ? "text-xs" : "text-[10px]"
            )}
          >
            {candidate.caption}
          </p>
        </div>
      ) : null}
    </div>
  )
}

function CandidatePreviewMedia({
  aspectRatio,
  candidate,
  candidateIndex,
  preset,
  source,
}: {
  aspectRatio: LongToShortSettings["aspectRatio"]
  candidate: LongToShortCandidate
  candidateIndex: number
  preset: LongToShortCaptionPreset
  source: LongToShortSource
}) {
  const mediaUrl = candidate.assetUrl ?? source.assetUrl

  if (mediaUrl && source.type === "VIDEO") {
    return (
      <video
        src={mediaUrl}
        poster={candidate.thumbnailUrl ?? source.thumbnailUrl ?? undefined}
        controls
        playsInline
        preload="metadata"
        className={cn(
          "mx-auto rounded-xl bg-black shadow-[0_24px_80px_rgba(0,0,0,0.45)]",
          getAspectClass(aspectRatio),
          aspectRatio === "9:16"
            ? "max-h-[70vh] max-w-[23rem]"
            : "max-h-[70vh] w-full max-w-[48rem]"
        )}
      />
    )
  }

  if (mediaUrl && source.type === "AUDIO") {
    return (
      <div className="mx-auto flex w-full max-w-[30rem] flex-col items-center justify-center gap-5 rounded-xl border border-white/12 bg-zinc-950/78 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <div className="space-y-1 text-center">
          <p className="text-sm font-semibold text-white">{candidate.title}</p>
          <p className="text-xs text-white/55">
            {formatSecondsAsClock(candidate.startTime)}-{formatSecondsAsClock(candidate.endTime)}
          </p>
        </div>
        <audio
          src={mediaUrl}
          controls
          preload="metadata"
          className="w-full"
        />
      </div>
    )
  }

  return (
    <CandidateThumbnail
      aspectRatio={aspectRatio}
      candidate={candidate}
      index={candidateIndex}
      preset={preset}
      size="preview"
    />
  )
}

type LongToShortWorkspaceProps = {
  open?: boolean
  sourceMediaId?: string | null
  onOpenChange?: (isOpen: boolean) => void
}

export function LongToShortWorkspace({
  open = true,
  sourceMediaId = null,
  onOpenChange,
}: LongToShortWorkspaceProps = {}) {
  const router = useRouter()
  const { selectedWorkspaceId } = useWorkspace()
  const workspaceId = selectedWorkspaceId ?? ""

  const [sources, setSources] = useState<LongToShortSource[]>([])
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null)
  const [settings, setSettings] = useState<LongToShortSettings>(defaultLongToShortSettings)
  const [isLibraryPickerOpen, setIsLibraryPickerOpen] = useState(false)
  const [runState, setRunState] = useState<RunState>("IDLE")
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>("SETUP")
  const [notification, setNotification] = useState<LongToShortNotification | null>(null)
  const [generationJob, setGenerationJob] = useState<ProcessingJobData | null>(null)
  const [hydratedSourceMediaId, setHydratedSourceMediaId] = useState<string | null>(null)
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null)
  const [candidateSearch, setCandidateSearch] = useState("")
  const sourceMediaQuery = useMediaDetail(workspaceId, sourceMediaId, {
    enabled: open && Boolean(sourceMediaId),
    pollUntilReady: true,
  })
  const mediaListQuery = useMediaList(workspaceId, {
    page: 1,
    limit: 50,
    status: "UPLOADED",
    sortBy: "createdAt",
    sortOrder: "desc",
  })
  const generateShortClips = useGenerateShortClips()
  const apiCandidateQuery = useClipCandidates(
    selectedSourceId,
    { page: 1, limit: 50, sortBy: "score", sortOrder: "desc" },
    Boolean(selectedSourceId)
  )
  const apiShortClipsQuery = useShortClips(
    selectedSourceId,
    { page: 1, limit: 50, sortBy: "createdAt", sortOrder: "desc" },
    Boolean(selectedSourceId)
  )
  const shortClipDownloadUrls = useShortClipDownloadUrls(
    apiShortClipsQuery.data?.items ?? [],
    Boolean(selectedSourceId)
  )

  const mediaLibrarySources =
    mediaListQuery.data?.items
      .filter((item) => item.libraryGroup === "ORIGINAL")
      .filter((item) => item.type === "VIDEO" || item.type === "AUDIO")
      .map(buildMediaLibrarySource) ?? []
  const sourceOptions = [
    ...sources,
    ...mediaLibrarySources.filter(
      (source) => !sources.some((existingSource) => existingSource.id === source.id)
    ),
  ]
  const selectedSource =
    sourceOptions.find((source) => source.id === selectedSourceId) ?? null
  const selectedPreset =
    longToShortCaptionPresets.find((preset) => preset.id === settings.captionPresetId) ??
    longToShortCaptionPresets[0]
  const shortClipsByCandidateId = new Map(
    apiShortClipsQuery.data?.items
      .filter((clip) => clip.candidateId)
      .map((clip) => [clip.candidateId!, clip]) ?? []
  )
  const sourceCandidates =
    apiCandidateQuery.data?.items.map((candidate) => {
      const shortClip = shortClipsByCandidateId.get(candidate.id)

      return mapClipCandidate(
        candidate,
        shortClip,
        shortClip?.id ? shortClipDownloadUrls[shortClip.id] ?? null : null
      )
    }) ?? []
  const filteredCandidates = sourceCandidates.filter((candidate) => {
    const query = candidateSearch.trim().toLowerCase()

    if (!query) {
      return true
    }

    return [candidate.title, candidate.caption, candidate.transcript]
      .join(" ")
      .toLowerCase()
      .includes(query)
  })
  const selectedCandidate =
    sourceCandidates.find((candidate) => candidate.id === selectedCandidateId) ?? null
  const selectedCandidateIndex = selectedCandidate
    ? sourceCandidates.findIndex((candidate) => candidate.id === selectedCandidate.id)
    : -1

  const finalizePendingSource = (source: LongToShortSource) => {
    setSources((currentSources) => [
      source,
      ...currentSources.filter((currentSource) => currentSource.id !== source.id),
    ])
    setSelectedSourceId(source.id)
    setSettings((currentSettings) => ({
      ...currentSettings,
      processingStartTime: 0,
      processingEndTime: source.durationSeconds,
    }))
    setIsLibraryPickerOpen(false)
    setWorkspaceView("SETUP")
    setRunState("IDLE")
    setSelectedCandidateId(null)
    setCandidateSearch("")
  }

  useEffect(() => {
    const media = sourceMediaQuery.data?.media

    if (!open || !media || hydratedSourceMediaId === media.id) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      finalizePendingSource(buildMediaSource(media))
      setHydratedSourceMediaId(media.id)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [hydratedSourceMediaId, open, sourceMediaQuery.data?.media])

  useEffect(() => {
    if (!generationJob || isTerminalJob(generationJob)) {
      return
    }

    const subscription = jobService.subscribeToJobEvents({
      jobId: generationJob.id,
      onError: () => undefined,
      onJob: (job) => {
        setGenerationJob(job)

        if (isTerminalJob(job)) {
          setRunState(job.status === "COMPLETED" ? "COMPLETED" : "IDLE")
          setNotification({
            id: `clips-job-${job.id}`,
            status: job.status === "COMPLETED" ? "SUCCESS" : "PROCESSING",
            title:
              job.status === "COMPLETED"
                ? "Clip job completed"
                : "Clip job stopped",
            description:
              job.status === "COMPLETED"
                ? "Refresh generated candidates and clips for review."
                : job.errorMessage ?? "The short clip job did not complete.",
          })
          void apiCandidateQuery.refetch()
          void apiShortClipsQuery.refetch()
        }
      },
    })

    return () => subscription.close()
  }, [apiCandidateQuery, apiShortClipsQuery, generationJob])

  const selectSource = (source: LongToShortSource) => {
    setSelectedSourceId(source.id)
    setSettings((currentSettings) => ({
      ...currentSettings,
      processingStartTime: 0,
      processingEndTime: source.durationSeconds,
    }))
    setRunState("IDLE")
    setWorkspaceView("SETUP")
    setSelectedCandidateId(null)
    setCandidateSearch("")
    setIsLibraryPickerOpen(false)
  }

  const handleRemoveSource = () => {
    setSelectedSourceId(null)
    setRunState("IDLE")
    setWorkspaceView("SETUP")
    setSelectedCandidateId(null)
    setCandidateSearch("")
    setIsLibraryPickerOpen(false)
    setNotification(null)
  }

  const handleStartGeneration = async () => {
    if (!selectedSource) {
      return
    }

    setRunState("GENERATING")
    setSelectedCandidateId(null)
    setNotification({
      id: `clips-processing-${Date.now()}`,
      status: "PROCESSING",
      title: "Generating clips",
      description: `${selectedSource.sourceFileName} is processing in the background.`,
    })

    try {
      const result = await generateShortClips.mutateAsync({
        mediaId: selectedSource.id,
        preferences: buildGenerationPreferences(settings),
      })
      setGenerationJob(result.job)
    } catch (error) {
      setRunState("IDLE")
      setNotification({
        id: `clips-failed-${Date.now()}`,
        status: "PROCESSING",
        title: "Unable to start clip generation",
        description:
          error instanceof Error
            ? error.message
            : "Please check the media transcript and try again.",
      })
      return
    }

    onOpenChange?.(false)
  }

  const openGeneratedResultsInLibrary = () => {
    if (!selectedSource) {
      return
    }

    setSelectedCandidateId(null)
    setNotification(null)
    onOpenChange?.(false)
    router.push(`/media-library?tab=long-to-short&source=${selectedSource.id}`)
  }

  const movePreviewSelection = (direction: "previous" | "next") => {
    if (sourceCandidates.length < 1 || selectedCandidateIndex < 0) {
      return
    }

    const offset = direction === "next" ? 1 : -1
    const nextIndex =
      (selectedCandidateIndex + offset + sourceCandidates.length) %
      sourceCandidates.length

    setSelectedCandidateId(sourceCandidates[nextIndex].id)
  }

  const handleDialogOpenChange = (nextOpen: boolean) => {
    onOpenChange?.(nextOpen)
    if (!nextOpen) {
      setIsLibraryPickerOpen(false)
      setSelectedCandidateId(null)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent
          className={cn(
            "!max-w-[calc(100vw-1.5rem)] max-h-[calc(100vh-3rem)] gap-0 overflow-y-auto rounded-2xl border-border/80 bg-card p-0",
            selectedSource && workspaceView === "RESULTS"
              ? "sm:!max-w-[96rem]"
              : "sm:!max-w-[44rem] md:!max-w-[52rem]"
          )}
          showCloseButton
        >
          {!selectedSource ? (
            <>
              <DialogHeader className="px-6 pb-4 pr-14 pt-6 sm:px-8 sm:pt-7">
              <DialogTitle className="text-[1.7rem] font-semibold tracking-normal">
                Long to shorts
              </DialogTitle>
              <DialogDescription className="max-w-xl text-[15px] leading-6">
                AI finds hooks, highlights, and turns your long-form video into
                short-form cuts.
              </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 px-6 pb-6 sm:px-8 sm:pb-8">
            <div className="rounded-xl border border-border/70 bg-background/50 p-4">
              <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
                <div className="overflow-hidden rounded-2xl border border-border bg-[linear-gradient(145deg,rgba(27,39,51,0.96),rgba(11,17,24,0.98))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                  <div className="aspect-video rounded-xl border border-white/10 bg-[linear-gradient(135deg,rgba(55,84,112,0.7),rgba(18,31,44,0.95))] p-4">
                    <div className="flex h-full items-end justify-between gap-3">
                      <div className="space-y-2">
                        <div className="h-3 w-20 rounded-full bg-white/20" />
                        <div className="h-3 w-28 rounded-full bg-white/14" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="size-12 rounded-xl bg-white/14" />
                        <div className="size-12 rounded-xl bg-white/10" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center">
                  <span className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-background/80 text-foreground shadow-[var(--shadow-natural-xs)]">
                    <ArrowRight className="size-5" />
                  </span>
                </div>

                <div className="overflow-hidden rounded-2xl border border-border bg-[linear-gradient(145deg,rgba(35,29,20,0.96),rgba(16,13,10,0.98))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2 aspect-[9/14] rounded-xl border border-white/10 bg-white/12" />
                    <div className="grid gap-2">
                      <div className="aspect-[9/12] rounded-xl border border-white/10 bg-white/10" />
                      <div className="aspect-[9/12] rounded-xl border border-white/10 bg-white/8" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Button
                type="button"
                size="lg"
                className="h-12 w-full min-w-0 justify-center gap-2 px-5 text-[15px]"
                onClick={() => setIsLibraryPickerOpen(true)}
              >
                <Sparkles className="size-4" />
                Choose from Media Library
              </Button>
              <Button
                type="button"
                size="lg"
                variant="outline"
                className="h-12 w-full min-w-0 justify-center gap-2 px-5 text-[15px]"
                onClick={() => {
                  onOpenChange?.(false)
                  router.push("/media-library")
                }}
              >
                <UploadCloud className="size-4" />
                Upload media
              </Button>
            </div>
          </div>

          {isLibraryPickerOpen ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 px-4 supports-backdrop-filter:backdrop-blur-sm">
              <div className="max-h-[calc(100%-2rem)] w-full max-w-[40rem] overflow-y-auto rounded-2xl border border-border/80 bg-card p-6 shadow-[var(--shadow-panel)]">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h2 className="text-[1.05rem] font-semibold text-foreground">
                      Choose source media
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Pick one uploaded recording to start the long-to-short setup.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="rounded-full"
                    onClick={() => setIsLibraryPickerOpen(false)}
                  >
                    <span className="sr-only">Close media source picker</span>
                    <Plus className="size-4 rotate-45" />
                  </Button>
                </div>

                <div className="grid gap-3">
                  {mediaListQuery.isLoading ? (
                    <div className="rounded-xl border border-dashed border-border bg-background/60 px-4 py-8 text-center text-sm text-muted-foreground">
                      Loading media library...
                    </div>
                  ) : sourceOptions.length < 1 ? (
                    <div className="rounded-xl border border-dashed border-border bg-background/60 px-4 py-8 text-center">
                      <p className="text-sm font-medium text-foreground">
                        No uploaded media yet
                      </p>
                      <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
                        Upload a video or audio file in Media Library, then come
                        back to generate short clips.
                      </p>
                      <Button
                        type="button"
                        className="mt-4"
                        onClick={() => {
                          onOpenChange?.(false)
                          router.push("/media-library")
                        }}
                      >
                        Open Media Library
                      </Button>
                    </div>
                  ) : sourceOptions.map((source) => {
                    const SourceIcon =
                      source.type === "VIDEO" ? Clapperboard : AudioLines

                    return (
                      <button
                        key={source.id}
                        type="button"
                        onClick={() => selectSource(source)}
                        className="flex items-center rounded-xl border border-border/70 bg-background/60 px-4 py-3 text-left transition hover:border-foreground/18 hover:bg-muted/30"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-muted/60 text-muted-foreground">
                            <SourceIcon className="size-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                              {source.title}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {source.sourceFileName} · {source.durationLabel} · {source.resolutionLabel}
                            </p>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : null}
            </>
          ) : null}

          {selectedSource ? (
            <DialogHeader className="sr-only">
              <DialogTitle>
                {workspaceView === "RESULTS"
                  ? "Generated long-to-short clips"
                  : "Long to short setup"}
              </DialogTitle>
              <DialogDescription>
                {workspaceView === "RESULTS"
                  ? "Review generated clip candidates, search moments, select clips, or export results."
                  : "Configure clipping settings, captions, aspect ratio, and generation options for the selected source media."}
              </DialogDescription>
            </DialogHeader>
          ) : null}

      {selectedSource && workspaceView === "SETUP" ? (
        <div className="mx-auto flex w-full max-w-[34rem] flex-col items-stretch gap-4 py-8 sm:py-12">
          <section className="rounded-lg border border-border/80 bg-background/75 px-3 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <UploadCloud className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate text-sm text-muted-foreground">
                  {selectedSource.sourceFileName}
                </span>
              </div>
              <button
                type="button"
                onClick={handleRemoveSource}
                className="shrink-0 text-xs font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                Remove
              </button>
            </div>
          </section>

          <Button
            type="button"
            size="lg"
            className="h-11 w-full rounded-lg text-[14px] font-semibold"
            onClick={handleStartGeneration}
            disabled={runState === "GENERATING"}
          >
            {runState === "GENERATING" ? (
              <>
                <CircleDashed className="size-4 animate-spin" />
                Generating clips...
              </>
            ) : (
              <>
                <WandSparkles className="size-4" />
                Get clips in 1 click
              </>
            )}
          </Button>

          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <InlineSelect
              label="Speech language:"
              options={longToShortSpeechLanguageOptions}
              value={settings.speechLanguage}
              onChange={(value) =>
                setSettings((currentSettings) => ({
                  ...currentSettings,
                  speechLanguage: value as LongToShortSettings["speechLanguage"],
                }))
              }
            />

            <span>Captions follow the selected preset</span>
          </div>

          <PreviewMock
            aspectRatio={settings.aspectRatio}
            preset={selectedPreset}
            source={selectedSource}
          />

          <section className="mt-3 rounded-xl border border-border/70 bg-card shadow-[var(--shadow-card)]">
            <div className="flex border-b border-border/70 px-3">
              <button
                type="button"
                onClick={() =>
                  setSettings((currentSettings) => ({
                    ...currentSettings,
                    mode: "AI_CLIPPING",
                  }))
                }
                className={cn(
                  "border-b-2 px-3 py-3 text-sm font-semibold transition",
                  settings.mode === "AI_CLIPPING"
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                AI clipping
              </button>
            </div>

            <div className="space-y-5 px-4 py-4">
              <div className="flex items-center justify-between gap-3 overflow-x-auto text-xs text-muted-foreground [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <InlineSelect
                  label="Clip model"
                  options={longToShortClipModelOptions}
                  value={settings.clipModel}
                  onChange={(value) =>
                    setSettings((currentSettings) => ({
                      ...currentSettings,
                      clipModel: value as LongToShortSettings["clipModel"],
                    }))
                  }
                />

                <InlineSelect
                  label="Genre"
                  options={longToShortGenreOptions}
                  value={settings.genre}
                  onChange={(value) =>
                    setSettings((currentSettings) => ({
                      ...currentSettings,
                      genre: value as LongToShortSettings["genre"],
                    }))
                  }
                />

                <InlineSelect
                  label="Clip Length"
                  options={longToShortClipLengthOptions}
                  selectedLabel={settings.clipLength === "AUTO" ? "Auto" : undefined}
                  value={settings.clipLength}
                  onChange={(value) =>
                    setSettings((currentSettings) => ({
                      ...currentSettings,
                      clipLength: value as LongToShortSettings["clipLength"],
                    }))
                  }
                />

                <button
                  type="button"
                  onClick={() =>
                    setSettings((currentSettings) => ({
                      ...currentSettings,
                      autoHook: !currentSettings.autoHook,
                    }))
                  }
                  aria-pressed={settings.autoHook}
                  className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap"
                >
                  <span>Auto hook</span>
                  <span
                    className={cn(
                      "relative inline-flex h-5 w-9 rounded-full border transition",
                      settings.autoHook
                        ? "border-foreground bg-foreground"
                        : "border-border bg-muted"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute top-1/2 size-4 -translate-y-1/2 rounded-full bg-background transition",
                        settings.autoHook ? "left-4" : "left-0.5"
                      )}
                    />
                  </span>
                </button>
              </div>

              {settings.mode === "AI_CLIPPING" ? (
                <label className="grid gap-2">
                  <span className="text-xs text-muted-foreground">
                    Include specific moments
                  </span>
                  <Input
                    value={settings.prompt}
                    onChange={(event) =>
                      setSettings((currentSettings) => ({
                        ...currentSettings,
                        prompt: event.target.value,
                      }))
                    }
                    className="h-9 rounded-md"
                    placeholder="Example: find all the moments when someone scored"
                  />
                </label>
              ) : null}

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Processing timeframe</span>
                  <Badge variant="success" className="rounded-md">
                    Faster
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div className="relative h-3">
                    <div className="absolute left-1 right-1 top-1/2 h-1 -translate-y-1/2 rounded-full bg-muted" />
                    <div className="absolute left-0 top-1/2 size-3 -translate-y-1/2 rounded-full border border-foreground bg-background" />
                    <div className="absolute right-0 top-1/2 size-3 -translate-y-1/2 rounded-full border border-foreground bg-background" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">
                      {formatSecondsAsClock(settings.processingStartTime)}
                    </span>
                    <span className="rounded-md bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">
                      {formatSecondsAsClock(settings.processingEndTime)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border/70 bg-card shadow-[var(--shadow-card)]">
            <div className="flex border-b border-border/70 px-3">
              <div className="border-b-2 border-foreground px-3 py-3 text-sm font-semibold text-foreground">
                Caption presets
              </div>
            </div>

            <div className="space-y-4 px-4 py-4">
              <p className="text-xs text-muted-foreground">Caption</p>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                {longToShortCaptionPresets.map((preset) => {
                  const isActive = settings.captionPresetId === preset.id
                  const tone = getPresetToneClasses(preset.tone)

                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() =>
                        setSettings((currentSettings) => ({
                          ...currentSettings,
                          captionPresetId: preset.id,
                        }))
                      }
                      className="min-w-0 text-center"
                    >
                      <div
                        className={cn(
                          "relative flex aspect-[1.35] items-center justify-center rounded-lg border transition",
                          tone.frame,
                          isActive
                            ? "border-foreground shadow-[0_0_0_1px_var(--foreground)]"
                            : "border-border hover:border-foreground/30"
                        )}
                      >
                        {preset.isNew ? (
                          <Badge variant="warning" className="absolute right-1 top-1 px-1 text-[9px]">
                            New
                          </Badge>
                        ) : null}
                        {preset.isNoCaption ? (
                          <Ban className="size-6 text-muted-foreground" />
                        ) : (
                          <div className="scale-75 text-center">
                            <p className={cn("text-sm font-semibold leading-tight", tone.primary)}>
                              {preset.samplePrimary}
                            </p>
                            <p className={cn("text-sm font-semibold leading-tight", tone.secondary)}>
                              {preset.sampleSecondary}
                            </p>
                          </div>
                        )}
                      </div>
                      <p className="mt-1 truncate text-[10px] text-muted-foreground">
                        {preset.label}
                      </p>
                    </button>
                  )
                })}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>Choose aspect ratio</span>
                <div className="inline-flex items-center gap-1">
                  {(["9:16", "1:1", "16:9"] as const).map((aspectRatio) => (
                    <button
                      key={aspectRatio}
                      type="button"
                      onClick={() =>
                        setSettings((currentSettings) => ({
                          ...currentSettings,
                          aspectRatio,
                        }))
                      }
                      className={cn(
                        "rounded-md px-2 py-1 font-semibold transition",
                        settings.aspectRatio === aspectRatio
                          ? "bg-foreground text-background"
                          : "text-foreground hover:bg-muted"
                      )}
                    >
                      {aspectRatio}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

        </div>
      ) : null}

      {selectedSource && workspaceView === "RESULTS" ? (
        <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-6">
          <section className="bg-card">
            <div className="flex flex-col gap-4 border-b border-border/70 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {selectedSource.sourceFileName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {sourceCandidates.length} generated candidates · {selectedSource.durationLabel}
                  </p>
                </div>
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row lg:max-w-3xl">
                <label className="relative min-w-0 flex-1">
                  <span className="sr-only">Find keywords or moments</span>
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={candidateSearch}
                    onChange={(event) => setCandidateSearch(event.target.value)}
                    className="h-10 rounded-lg pl-9"
                    placeholder="Find keywords or moments..."
                  />
                </label>
              </div>
            </div>

            <div className="space-y-4 px-4 py-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">Original clips</p>
                  {settings.autoHook ? (
                    <p className="mt-1 max-w-4xl text-sm leading-6 text-muted-foreground">
                      AI hook is enabled, so each recommended cut includes a short
                      opening hook suggestion. Disable it in setup if the original
                      opening should stay untouched.
                    </p>
                  ) : (
                    <p className="mt-1 max-w-4xl text-sm leading-6 text-muted-foreground">
                      Review generated candidates and choose the cuts worth turning
                      into short-form drafts.
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setWorkspaceView("SETUP")}
                >
                  <SlidersHorizontal className="size-4" />
                  Adjust setup
                </Button>
              </div>

              {sourceCandidates.length < 1 ? (
                <div className="rounded-xl border border-dashed border-border bg-background/60 px-5 py-12 text-center">
                  <p className="text-sm font-medium text-foreground">
                    No clips generated yet
                  </p>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                    This source does not have generated candidates yet. Start
                    generation, then return here when the background job
                    produces clip candidates.
                  </p>
                  <Button
                    type="button"
                    className="mt-5"
                    onClick={() => setWorkspaceView("SETUP")}
                  >
                    Back to setup
                  </Button>
                </div>
              ) : filteredCandidates.length < 1 ? (
                <div className="rounded-xl border border-dashed border-border bg-background/60 px-5 py-12 text-center text-sm text-muted-foreground">
                  No clips match the current search.
                </div>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
                  {filteredCandidates.map((candidate) => {
                    const sourceIndex = sourceCandidates.findIndex(
                      (sourceCandidate) => sourceCandidate.id === candidate.id
                    )
                    const rankLabel = `#${sourceIndex + 1}`

                    return (
                      <article
                        key={candidate.id}
                        className="group overflow-hidden rounded-xl border border-border/70 bg-background/70 shadow-[var(--shadow-card)] transition hover:border-foreground/20 hover:bg-card"
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedCandidateId(candidate.id)}
                          className="block w-full px-4 pt-4 text-left"
                        >
                          <CandidateThumbnail
                            aspectRatio={settings.aspectRatio}
                            candidate={candidate}
                            index={sourceIndex}
                            preset={selectedPreset}
                          />
                        </button>

                        <div className="space-y-3 px-4 pb-4 pt-3">
                          <span className="block text-lg font-semibold text-foreground">
                            {rankLabel}
                          </span>

                          <div className="min-h-12">
                            <button
                              type="button"
                              onClick={() => setSelectedCandidateId(candidate.id)}
                              className="line-clamp-2 text-left text-base font-semibold leading-6 text-foreground hover:underline"
                            >
                              {candidate.title}
                            </button>
                          </div>

                          <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                            <span>{getTimeRangeLabel(candidate)}</span>
                            <span>{getPlatformLabel(candidate.platform)}</span>
                          </div>

                          <div className="grid grid-cols-1 gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="justify-center"
                              onClick={() => setSelectedCandidateId(candidate.id)}
                            >
                              <span className="sr-only">Preview candidate</span>
                              <Play className="size-4" />
                              Preview
                            </Button>
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      ) : null}

      {selectedSource && selectedCandidate ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/88 px-4 py-5 text-white supports-backdrop-filter:backdrop-blur-sm">
          <div className="mx-auto flex min-h-full max-w-6xl flex-col">
            <div className="mb-4 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                onClick={() => movePreviewSelection("previous")}
              >
                <span className="sr-only">Previous candidate</span>
                <ArrowLeft className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                onClick={() => movePreviewSelection("next")}
              >
                <span className="sr-only">Next candidate</span>
                <ArrowRight className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                onClick={() => setSelectedCandidateId(null)}
              >
                <span className="sr-only">Close preview</span>
                <X className="size-4" />
              </Button>
            </div>

            <div className="m-auto grid w-full gap-4 lg:grid-cols-[minmax(18rem,23rem)_minmax(0,1fr)] lg:items-start">
              <div className="flex justify-center">
                <CandidatePreviewMedia
                  aspectRatio={settings.aspectRatio}
                  candidate={selectedCandidate}
                  candidateIndex={Math.max(selectedCandidateIndex, 0)}
                  preset={selectedPreset}
                  source={selectedSource}
                />
              </div>

              <section className="rounded-xl border border-white/12 bg-zinc-950/78 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
                <div className="border-b border-white/10 pb-4">
                  <div>
                    <p className="text-sm text-white/55">
                      #{selectedCandidateIndex + 1} · {selectedSource.sourceFileName}
                    </p>
                    <h2 className="mt-2 text-xl font-semibold leading-7 text-white">
                      {selectedCandidate.title}
                    </h2>
                  </div>
                </div>

                <div className="mt-4 space-y-5">
                  <div>
                    <p className="text-sm leading-6 text-white/68">
                      {selectedCandidate.caption}
                    </p>
                  </div>

                  <div className="grid gap-3 rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-white/68 sm:grid-cols-3">
                    <div>
                      <p className="text-xs uppercase text-white/42">Range</p>
                      <p className="mt-1 font-medium text-white">
                        {getTimeRangeLabel(selectedCandidate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-white/42">Platform</p>
                      <p className="mt-1 font-medium text-white">
                        {getPlatformLabel(selectedCandidate.platform)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-white/42">Transcript</p>
                      <p className="mt-1 font-medium text-white">
                        {selectedCandidate.transcriptVersionLabel}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-white">Why this clip</p>
                    <ul className="mt-3 grid gap-2">
                      {selectedCandidate.reviewNotes.map((note) => (
                        <li
                          key={note}
                          className="flex items-center gap-2 text-sm text-white/70"
                        >
                          <CheckCircle2 className="size-4 shrink-0 text-emerald-300" />
                          <span>{note}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>

            </div>
          </div>
        </div>
      ) : null}
        </DialogContent>
      </Dialog>
      {notification ? (
        <div className="fixed bottom-4 right-4 z-[70] w-[min(22rem,calc(100vw-2rem))]">
          {notification.status === "SUCCESS" ? (
            <button
              type="button"
              className="w-full rounded-2xl border border-emerald-500/30 bg-card p-4 text-left text-card-foreground shadow-[0_18px_60px_rgba(0,0,0,0.26)] transition hover:border-emerald-500/50 hover:bg-muted/30"
              onClick={openGeneratedResultsInLibrary}
            >
              <span className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                  <CheckCircle2 className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-foreground">
                    {notification.title}
                  </span>
                  <span className="mt-1 block text-sm leading-5 text-muted-foreground">
                    {notification.description}
                  </span>
                  <span className="mt-3 inline-flex text-xs font-semibold text-foreground">
                    View results
                  </span>
                </span>
              </span>
            </button>
          ) : (
            <div
              role="status"
              className="rounded-2xl border border-sky-500/25 bg-card p-4 text-card-foreground shadow-[0_18px_60px_rgba(0,0,0,0.26)]"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-sky-500/25 bg-sky-500/10 text-sky-600 dark:text-sky-300">
                  <CircleDashed className="size-4 animate-spin" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {notification.title}
                  </p>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">
                    {notification.description}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </>
  )
}
