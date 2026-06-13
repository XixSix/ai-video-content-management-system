export type LongToShortSourceStatus = "READY" | "PROCESSING" | "NEEDS_TRANSCRIPT"
export type LongToShortJobStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED"
export type LongToShortAspectRatio = "9:16" | "1:1" | "16:9"
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
  type: "VIDEO" | "AUDIO"
  durationLabel: string
  transcriptStatus: "READY" | "MISSING"
  chapterStatus: "READY" | "MISSING"
  status: LongToShortSourceStatus
}

export type LongToShortSettings = {
  clipCount: number
  minDuration: number
  maxDuration: number
  aspectRatio: LongToShortAspectRatio
  platform: LongToShortPlatform
  burnSubtitles: boolean
}

export type LongToShortCandidate = {
  id: string
  sourceId: string
  sourceChapterLabel?: string
  title: string
  caption: string
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
