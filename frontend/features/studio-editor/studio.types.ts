import type { LucideIcon } from "lucide-react"

export type StudioToolId =
  | "media"
  | "assets"
  | "text"
  | "captions"
  | "chapters"
  | "audio"
  | "clips"
  | "ai"

export type StudioRailItem = {
  id: StudioToolId
  label: string
  icon: LucideIcon
}

export type StudioLayerKind = "image" | "text" | "captions"

export type StudioCanvasLayer = {
  id: string
  kind: StudioLayerKind
  label: string
  className: string
  summary: string
  frameClassName: string
}

export type StudioTimelineTone = "base" | "accent" | "muted"

export type StudioTimelineSegment = {
  id: string
  label: string
  widthClassName: string
  offsetClassName?: string
  tone: StudioTimelineTone
  selectionId: string
  summary: string
  startTime?: number
}

export type StudioTimelineTrack = {
  id: string
  label: string
  selectionId: string
  segments: StudioTimelineSegment[]
}

export type StudioSourceMedia = {
  id: string
  name: string
  durationLabel: string
  resolutionLabel: string
  summary: string
}

export type StudioMediaDetail = {
  id: string
  title: string
  thumbnailUrl: string
  durationSeconds: number
  durationLabel: string
  status: "UPLOADED" | "PROCESSING" | "FAILED"
  type: "VIDEO" | "AUDIO"
  width: number
  height: number
  streamUrl: string
}

export type StudioProjectMediaType = "VIDEO" | "AUDIO" | "IMAGE" | "SUBTITLE"

export type StudioProjectMediaStatus =
  | "READY"
  | "UPLOADING"
  | "PROCESSING"
  | "FAILED"

export type StudioProjectMediaOrigin = "SOURCE" | "LIBRARY" | "UPLOAD"

export type StudioProjectMediaItem = {
  id: string
  type: StudioProjectMediaType
  name: string
  summary: string
  origin: StudioProjectMediaOrigin
  status: StudioProjectMediaStatus
  format: string
  metadata: string
  usageLabel: string
  durationLabel?: string
  resolutionLabel?: string
  dimensionsLabel?: string
  sizeLabel?: string
  language?: string
  linkedMediaName?: string
  linkedSelectionId?: string
  startTime?: number
}

export type StudioTranscript = {
  id: string
  language: string
  version: number
  wordCount: number
  isEdited: boolean
  fullText: string
  source: string
  createdAt: string
}

export type StudioTranscriptSegment = {
  id: string
  segmentIndex: number
  startTime: number
  endTime: number
  text: string
  speakerLabel: string
  confidence: number
}

export type StudioChapter = {
  id: string
  chapterIndex: number
  startTime: number
  endTime: number
  title: string
  summary: string
  transcriptVersion: number
  score: number
}

export type StudioClipCandidateStatus = "CANDIDATE" | "SELECTED" | "REJECTED"

export type StudioClipCandidate = {
  id: string
  startTime: number
  endTime: number
  duration: number
  text: string
  finalScore: number
  hookScore: number
  status: StudioClipCandidateStatus
  transcriptVersion: number
}

export type StudioShortClip = {
  id: string
  title: string
  caption: string
  duration: number
  status: "DRAFT" | "READY" | "FAILED"
  videoPath: string
  thumbnailPath: string
  aspectRatio: "9:16" | "1:1" | "16:9"
  transcriptVersion: number
}

export type StudioGeneratedAsset = {
  id: string
  assetType: "SRT" | "VTT" | "BURNED_SUBTITLE_VIDEO" | "THUMBNAIL"
  label: string
  status: "READY" | "GENERATING" | "FAILED"
  transcriptVersion: number
}

export type StudioProcessingJob = {
  id: string
  jobType: "TRANSCRIPT" | "CHAPTERS" | "CLIPS" | "SUBTITLES"
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED"
  progress: number
  currentStep: string
}

export type StudioStaleOutputType = "chapters" | "clips" | "assets"

export type StudioToolPanelItem = {
  id: string
  label: string
  meta?: string
  selectionId?: string
}

export type StudioToolPanelSection = {
  id: string
  title: string
  items: StudioToolPanelItem[]
}

export type StudioToolPanelContent = {
  title: string
  sections: StudioToolPanelSection[]
}

export type StudioSelection =
  | {
      id: string
      kind: "source"
      label: string
      summary: string
    }
  | {
      id: string
      kind: "layer"
      label: string
      summary: string
      detail: string
    }
  | {
      id: string
      kind: "segment"
      label: string
      summary: string
      detail: string
      linkedSelectionId: string
      trackLabel: string
    }
  | {
      id: string
      kind: "media"
      label: string
      summary: string
      detail: string
      media: StudioProjectMediaItem
      linkedSelectionId?: string
    }

export type StudioEditorProject = {
  media: StudioMediaDetail
  projectMedia: StudioProjectMediaItem[]
  transcript: StudioTranscript
  transcriptSegments: StudioTranscriptSegment[]
  chapters: StudioChapter[]
  clipCandidates: StudioClipCandidate[]
  shortClips: StudioShortClip[]
  generatedAssets: StudioGeneratedAsset[]
  processingJobs: StudioProcessingJob[]
  sourceMedia: StudioSourceMedia
  layers: StudioCanvasLayer[]
  timelineTracks: StudioTimelineTrack[]
}
