export type LongToShortSourceStatus = "READY" | "PROCESSING" | "NEEDS_TRANSCRIPT"
export type LongToShortJobStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED"
export type LongToShortAspectRatio = "9:16" | "1:1" | "16:9"
export type LongToShortSpeechLanguage = "AUTO" | "ENGLISH" | "VIETNAMESE"
export type LongToShortClipModel = "AUTO" | "BALANCED" | "VIRAL_HOOKS"
export type LongToShortGenre = "AUTO" | "PODCAST" | "INTERVIEW" | "TUTORIAL" | "WEBINAR"
export type LongToShortClipLength = "AUTO" | "15_30" | "30_60" | "60_90"
export type LongToShortMode = "AI_CLIPPING" | "MANUAL_MOMENTS"
export type LongToShortPlatform =
  | "TIKTOK"
  | "YOUTUBE_SHORTS"
  | "INSTAGRAM_REELS"
export type LongToShortCandidateStatus =
  | "RECOMMENDED"
  | "SELECTED"
  | "REJECTED"
  | "NEEDS_REVIEW"
export type LongToShortClipStatus = "DRAFT" | "READY" | "FAILED"

export type LongToShortSource = {
  id: string
  projectSlug: string
  title: string
  sourceFileName: string
  assetUrl?: string | null
  thumbnailUrl?: string | null
  type: "VIDEO" | "AUDIO"
  durationSeconds: number
  durationLabel: string
  resolutionLabel: string
  transcriptStatus: "READY" | "MISSING"
  chapterStatus: "READY" | "MISSING"
  status: LongToShortSourceStatus
}

export type LongToShortSettings = {
  mode: LongToShortMode
  speechLanguage: LongToShortSpeechLanguage
  clipModel: LongToShortClipModel
  genre: LongToShortGenre
  clipLength: LongToShortClipLength
  autoHook: boolean
  prompt: string
  captionPresetId: string
  aspectRatio: LongToShortAspectRatio
  processingStartTime: number
  processingEndTime: number
}

export type LongToShortCaptionPreset = {
  id: string
  label: string
  samplePrimary: string
  sampleSecondary: string
  tone: "neutral" | "lime" | "amber" | "violet"
  isNew?: boolean
  isNoCaption?: boolean
}

export type LongToShortCandidate = {
  id: string
  sourceId: string
  shortClipId?: string
  generatedAssetId?: string
  assetUrl?: string | null
  sourceChapterLabel?: string
  title: string
  caption: string
  thumbnailUrl?: string | null
  startTime: number
  endTime: number
  duration: number
  transcript: string
  reviewNotes: string[]
  status: LongToShortCandidateStatus
  aspectRatio: LongToShortAspectRatio
  platform: LongToShortPlatform
  burnSubtitles: boolean
  transcriptVersionLabel: string
  shortClipStatus?: "PENDING" | "RENDERING" | "READY" | "FAILED" | "DELETED"
  isOutdated?: boolean
}

export type LongToShortClip = {
  id: string
  sourceId: string
  sourceCandidateId?: string
  title: string
  caption: string
  startTime: number
  endTime: number
  duration: number
  status: LongToShortClipStatus
  aspectRatio: LongToShortAspectRatio
  platform: LongToShortPlatform
  burnSubtitles: boolean
  updatedAtLabel: string
}

export type LongToShortJob = {
  sourceId: string
  status: LongToShortJobStatus
  progress: number
  currentStep: string
}
