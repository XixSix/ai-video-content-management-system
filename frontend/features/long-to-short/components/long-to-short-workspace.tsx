"use client"

import type { ChangeEvent } from "react"
import { useEffect, useId, useRef, useState } from "react"
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
  Copy,
  Download,
  Filter,
  Mic2,
  Plus,
  Play,
  Scissors,
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
  longToShortCandidatesBySourceId,
  longToShortClipLengthOptions,
  longToShortClipModelOptions,
  longToShortGenreOptions,
  longToShortSpeechLanguageOptions,
  longToShortSources,
} from "@/features/long-to-short/long-to-short.data"
import type {
  LongToShortCaptionPreset,
  LongToShortCandidate,
  LongToShortSettings,
  LongToShortSource,
} from "@/features/long-to-short/long-to-short.types"
import { cn } from "@/lib/utils"

type PresetTab = "QUICK_PRESETS" | "MY_TEMPLATES"
type UploadState = "IDLE" | "UPLOADING"
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

function getCandidateStatusBadge(status: LongToShortCandidate["status"]) {
  if (status === "SELECTED") {
    return { label: "Selected", variant: "success" as const }
  }

  if (status === "NEEDS_REVIEW") {
    return { label: "Needs review", variant: "warning" as const }
  }

  if (status === "REJECTED") {
    return { label: "Skipped", variant: "neutral" as const }
  }

  return { label: "Recommended", variant: "info" as const }
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

function buildMockUploadSource(fileName: string, type: LongToShortSource["type"]) {
  const slug = fileName
    .toLowerCase()
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  const durationSeconds = type === "VIDEO" ? 452 : 618

  return {
    id: `source_upload_${Date.now()}`,
    projectSlug: slug || `uploaded-${Date.now()}`,
    title: fileName.replace(/\.[^/.]+$/, ""),
    sourceFileName: fileName,
    assetUrl: null,
    thumbnailUrl: null,
    type,
    durationSeconds,
    durationLabel: formatSecondsAsClock(durationSeconds),
    resolutionLabel: type === "VIDEO" ? "1080p" : "Audio only",
    transcriptStatus: "READY" as const,
    chapterStatus: "READY" as const,
    status: "READY" as const,
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
  if (source.assetUrl && source.type === "VIDEO") {
    return (
      <video
        src={`${source.assetUrl}#t=${candidate.startTime},${candidate.endTime}`}
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

  if (source.assetUrl && source.type === "AUDIO") {
    return (
      <div className="mx-auto flex w-full max-w-[30rem] flex-col items-center justify-center gap-5 rounded-xl border border-white/12 bg-zinc-950/78 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <div className="space-y-1 text-center">
          <p className="text-sm font-semibold text-white">{candidate.title}</p>
          <p className="text-xs text-white/55">
            {formatSecondsAsClock(candidate.startTime)}-{formatSecondsAsClock(candidate.endTime)}
          </p>
        </div>
        <audio
          src={`${source.assetUrl}#t=${candidate.startTime},${candidate.endTime}`}
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
  onOpenChange?: (isOpen: boolean) => void
}

export function LongToShortWorkspace({
  open = true,
  onOpenChange,
}: LongToShortWorkspaceProps = {}) {
  const router = useRouter()
  const srtInputId = useId()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const srtInputRef = useRef<HTMLInputElement | null>(null)

  const [sources, setSources] = useState(longToShortSources)
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null)
  const [settings, setSettings] = useState<LongToShortSettings>(defaultLongToShortSettings)
  const [isLibraryPickerOpen, setIsLibraryPickerOpen] = useState(false)
  const [uploadState, setUploadState] = useState<UploadState>("IDLE")
  const [uploadProgress, setUploadProgress] = useState(0)
  const [pendingSource, setPendingSource] = useState<LongToShortSource | null>(null)
  const [srtFileName, setSrtFileName] = useState<string | null>(null)
  const [presetTab, setPresetTab] = useState<PresetTab>("QUICK_PRESETS")
  const [runState, setRunState] = useState<RunState>("IDLE")
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>("SETUP")
  const [notification, setNotification] = useState<LongToShortNotification | null>(null)
  const [candidatesBySource, setCandidatesBySource] = useState(
    longToShortCandidatesBySourceId
  )
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null)
  const [candidateSearch, setCandidateSearch] = useState("")

  const selectedSource =
    sources.find((source) => source.id === selectedSourceId) ?? null
  const selectedPreset =
    longToShortCaptionPresets.find((preset) => preset.id === settings.captionPresetId) ??
    longToShortCaptionPresets[0]
  const sourceCandidates = selectedSource
    ? candidatesBySource[selectedSource.id] ?? []
    : []
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
    setUploadState("IDLE")
    setUploadProgress(0)
    setPendingSource(null)
    setIsLibraryPickerOpen(false)
    setWorkspaceView("SETUP")
    setRunState("IDLE")
    setSelectedCandidateId(null)
    setCandidateSearch("")
  }

  useEffect(() => {
    if (uploadState !== "UPLOADING" || !pendingSource) {
      return
    }

    const intervalId = window.setInterval(() => {
      setUploadProgress((currentProgress) => {
        const nextProgress = Math.min(100, currentProgress + 12)

        if (nextProgress >= 100) {
          window.clearInterval(intervalId)
          finalizePendingSource(pendingSource)
        }

        return nextProgress
      })
    }, 180)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [pendingSource, uploadState])

  useEffect(() => {
    if (runState !== "GENERATING") {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setRunState("COMPLETED")
      setNotification({
        id: `clips-ready-${Date.now()}`,
        status: "SUCCESS",
        title: "Clips are ready",
        description: "Open the generated long-to-short candidates for review.",
      })
    }, 2800)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [runState])

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

  const handleFileSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const type = file.type.startsWith("audio/") ? "AUDIO" : "VIDEO"

    setPendingSource(buildMockUploadSource(file.name, type))
    setUploadState("UPLOADING")
    setUploadProgress(8)
    event.target.value = ""
  }

  const handleSrtSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    setSrtFileName(file.name)
    event.target.value = ""
  }

  const handleRemoveSource = () => {
    setSelectedSourceId(null)
    setSrtFileName(null)
    setRunState("IDLE")
    setWorkspaceView("SETUP")
    setSelectedCandidateId(null)
    setCandidateSearch("")
    setIsLibraryPickerOpen(false)
    setNotification(null)
  }

  const handleStartGeneration = () => {
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

  const selectCandidate = (candidateId: string) => {
    if (!selectedSource) {
      return
    }

    setCandidatesBySource((currentCandidates) => ({
      ...currentCandidates,
      [selectedSource.id]: (currentCandidates[selectedSource.id] ?? []).map((candidate) =>
        candidate.id === candidateId
          ? {
              ...candidate,
              status: "SELECTED",
            }
          : candidate
      ),
    }))
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
    if (uploadState === "UPLOADING") {
      onOpenChange?.(true)
      return
    }

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
          showCloseButton={uploadState !== "UPLOADING"}
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

            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,audio/*"
              className="sr-only"
              onChange={handleFileSelection}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Button
                type="button"
                size="lg"
                className="h-12 w-full min-w-0 justify-center gap-2 px-5 text-[15px]"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadState === "UPLOADING"}
              >
                <UploadCloud className="size-4" />
                Upload source file
              </Button>
              <Button
                type="button"
                size="lg"
                variant="outline"
                className="h-12 w-full min-w-0 justify-center gap-2 px-5 text-[15px]"
                onClick={() => setIsLibraryPickerOpen(true)}
                disabled={uploadState === "UPLOADING"}
              >
                <Sparkles className="size-4" />
                Choose from Media Library
              </Button>
            </div>

            {uploadState === "UPLOADING" && pendingSource ? (
              <div className="rounded-xl border border-border bg-background/90 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {pendingSource.sourceFileName}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Uploading {uploadProgress.toFixed(0)}%
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPendingSource(null)
                      setUploadState("IDLE")
                      setUploadProgress(0)
                    }}
                  >
                    Cancel
                  </Button>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-sky-500 transition-[width]"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>

                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <CircleDashed className="size-3.5 animate-spin" />
                  <span>{Math.max(1, Math.ceil((100 - uploadProgress) / 10))} seconds left</span>
                </div>
              </div>
            ) : null}
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
                  {sources.map((source) => {
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

            <input
              id={srtInputId}
              ref={srtInputRef}
              type="file"
              accept=".srt,.vtt"
              className="sr-only"
              onChange={handleSrtSelection}
            />
            <button
              type="button"
              className="font-medium underline underline-offset-2 hover:text-foreground"
              onClick={() => srtInputRef.current?.click()}
            >
              {srtFileName ? srtFileName : "Upload SRT (optional)"}
            </button>
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
              <button
                type="button"
                onClick={() =>
                  setSettings((currentSettings) => ({
                    ...currentSettings,
                    mode: "MANUAL_MOMENTS",
                  }))
                }
                className={cn(
                  "border-b-2 px-3 py-3 text-sm font-semibold transition",
                  settings.mode === "MANUAL_MOMENTS"
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                Don&apos;t clip
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
              <button
                type="button"
                onClick={() => setPresetTab("QUICK_PRESETS")}
                className={cn(
                  "border-b-2 px-3 py-3 text-sm font-semibold transition",
                  presetTab === "QUICK_PRESETS"
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                Quick presets
              </button>
              <button
                type="button"
                onClick={() => setPresetTab("MY_TEMPLATES")}
                className={cn(
                  "border-b-2 px-3 py-3 text-sm font-semibold transition",
                  presetTab === "MY_TEMPLATES"
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                My templates
              </button>
            </div>

            <div className="space-y-4 px-4 py-4">
              {presetTab === "QUICK_PRESETS" ? (
                <>
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
                </>
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-background/70 px-4 py-8 text-sm text-muted-foreground">
                  Saved templates will live here once user presets are wired.
                </div>
              )}

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

          <div className="flex justify-center pt-2">
            <Button type="button" variant="outline">
              Save settings above as default
            </Button>
          </div>
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

                <div className="flex shrink-0 items-center gap-2">
                  <Button type="button" variant="outline" size="sm">
                    <CheckCircle2 className="size-4" />
                    Select
                  </Button>
                  <Button type="button" variant="outline" size="sm">
                    <Filter className="size-4" />
                    Filter
                  </Button>
                  <Button type="button" variant="outline" size="sm">
                    <UploadCloud className="size-4" />
                    Export
                  </Button>
                </div>
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
                    This source does not have mock candidates yet. Return to setup
                    and choose another source from the media library.
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

                          <div className="grid grid-cols-4 gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon-sm"
                              onClick={() => setSelectedCandidateId(candidate.id)}
                            >
                              <span className="sr-only">Preview candidate</span>
                              <Play className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon-sm"
                              onClick={() => selectCandidate(candidate.id)}
                            >
                              <span className="sr-only">Select candidate</span>
                              <CheckCircle2 className="size-4" />
                            </Button>
                            <Button type="button" variant="outline" size="icon-sm">
                              <span className="sr-only">Download placeholder</span>
                              <Download className="size-4" />
                            </Button>
                            <Button type="button" variant="outline" size="icon-sm">
                              <span className="sr-only">Trim candidate</span>
                              <Scissors className="size-4" />
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

            <div className="m-auto grid w-full gap-4 lg:grid-cols-[minmax(18rem,23rem)_minmax(0,1fr)_11rem] lg:items-start">
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
                <div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm text-white/55">
                      #{selectedCandidateIndex + 1} · {selectedSource.sourceFileName}
                    </p>
                    <h2 className="mt-2 text-xl font-semibold leading-7 text-white">
                      {selectedCandidate.title}
                    </h2>
                  </div>
                  <Badge variant={getCandidateStatusBadge(selectedCandidate.status).variant}>
                    {getCandidateStatusBadge(selectedCandidate.status).label}
                  </Badge>
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

              <aside className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                <Button
                  type="button"
                  className="justify-start bg-white text-zinc-950 hover:bg-white/90"
                  onClick={() => selectCandidate(selectedCandidate.id)}
                >
                  <CheckCircle2 className="size-4" />
                  {selectedCandidate.status === "SELECTED" ? "Open draft" : "Select clip"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="justify-start border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                >
                  <Scissors className="size-4" />
                  Edit clip
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="justify-start border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                >
                  <WandSparkles className="size-4" />
                  AI hook
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="justify-start border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                >
                  <Mic2 className="size-4" />
                  Enhance speech
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="justify-start border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                >
                  <Clapperboard className="size-4" />
                  Add B-Roll
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="justify-start border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                >
                  <Copy className="size-4" />
                  Duplicate
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="justify-start border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                >
                  <Download className="size-4" />
                  Download
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="justify-start border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                >
                  <UploadCloud className="size-4" />
                  Publish
                </Button>
              </aside>
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
