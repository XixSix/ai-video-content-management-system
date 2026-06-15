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

export type StudioTextPresetCategory =
  | "TITLES"
  | "SOCIAL"
  | "LOWER_THIRDS"
  | "CALLOUTS"

export type StudioTextFontFamily =
  | "geist"
  | "montserrat"
  | "bebas-neue"
  | "anton"
  | "playfair-display"
  | "caveat"
  | "roboto-mono"
  | "oswald"
  | "teko"
  | "poppins"

export type StudioTextFontWeight = "regular" | "bold"

export type StudioTextFontStyle = "normal" | "italic"

export type StudioTextAlign = "left" | "center" | "right"

export type StudioTextBackgroundStyle = "none" | "shadow" | "box"

export type StudioTextAnimationBy = "text" | "word" | "character" | "line"

export type StudioTextAnimationName =
  | "none"
  | "fadeIn"
  | "blurIn"
  | "blurInUp"
  | "blurInDown"
  | "slideUp"
  | "slideDown"
  | "slideLeft"
  | "slideRight"
  | "scaleUp"
  | "scaleDown"

export type StudioCaptionTextDecoration = "none" | "underline"

export type StudioCaptionTextTransform = "none" | "uppercase"

export type StudioCaptionShadowStyle = "soft" | "hard"

export type StudioCanvasLayer = {
  id: string
  kind: StudioLayerKind
  label: string
  className: string
  summary: string
  frameClassName: string
  animationBy?: StudioTextAnimationBy
  animationDuration?: number
  animationName?: StudioTextAnimationName
  backgroundEnabled?: boolean
  backgroundColor?: string
  backgroundRadius?: number
  backgroundStyle?: StudioTextBackgroundStyle
  boxWidth?: number
  content?: string
  fontFamily?: StudioTextFontFamily
  fontSize?: number
  fontStyle?: StudioTextFontStyle
  fontWeight?: StudioTextFontWeight
  presetId?: string
  enabled?: boolean
  highlightColor?: string
  highlightEnabled?: boolean
  shadowEnabled?: boolean
  shadowStyle?: StudioCaptionShadowStyle
  strokeColor?: string
  strokeEnabled?: boolean
  strokeWidth?: number
  textAlign?: StudioTextAlign
  textColor?: string
  textDecoration?: StudioCaptionTextDecoration
  textTransform?: StudioCaptionTextTransform
}

export type StudioTextPreset = {
  id: string
  category: StudioTextPresetCategory
  label: string
  previewText: string
  styleSummary: string
  className: string
  frameClassName: string
  defaultStyle: {
    animationBy: StudioTextAnimationBy
    animationDuration: number
    animationName: StudioTextAnimationName
    backgroundColor: string
    backgroundRadius: number
    backgroundStyle: StudioTextBackgroundStyle
    boxWidth: number
    fontFamily: StudioTextFontFamily
    fontSize: number
    fontStyle: StudioTextFontStyle
    fontWeight: StudioTextFontWeight
    textAlign: StudioTextAlign
    textColor: string
  }
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
  thumbnailUrl: string | null
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
  assetUrl: string | null
  thumbnailUrl: string | null
  format: string
  metadata: string
  usageLabel: string
  durationSeconds?: number
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

export type StudioTranscriptWord = {
  id: string
  segmentId: string
  wordIndex: number
  startTime: number
  endTime: number
  sourceText: string
  text: string
  confidence: number
}

export type StudioCaptionWordGroup = {
  id: string
  sourceWordId: string
  sourceSegmentId: string
  startTime: number
  endTime: number
  sourceText: string
  text: string
  confidence: number
  isEdited: boolean
  isOmitted: boolean
}

export type StudioCaptionCue = {
  id: string
  startTime: number
  endTime: number
  speakerLabel: string
  sourceSegmentIds: string[]
  wordGroups: StudioCaptionWordGroup[]
}

export type StudioCaptionPreset = {
  id: string
  label: string
  previewText: string
  style: Pick<
    StudioCanvasLayer,
    | "animationBy"
    | "animationDuration"
    | "animationName"
    | "backgroundEnabled"
    | "backgroundColor"
    | "backgroundRadius"
    | "enabled"
    | "fontFamily"
    | "fontSize"
    | "fontStyle"
    | "fontWeight"
    | "highlightColor"
    | "highlightEnabled"
    | "presetId"
    | "shadowEnabled"
    | "shadowStyle"
    | "strokeColor"
    | "strokeEnabled"
    | "strokeWidth"
    | "textColor"
    | "textDecoration"
    | "textTransform"
  >
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
export type StudioAspectRatio = "9:16" | "1:1" | "16:9"
export type StudioClipPlatform =
  | "TIKTOK"
  | "YOUTUBE_SHORTS"
  | "INSTAGRAM_REELS"
export type StudioShortClipStatus = "DRAFT" | "READY" | "FAILED"

export type StudioClipCandidate = {
  id: string
  title: string
  caption: string
  startTime: number
  endTime: number
  duration: number
  text: string
  reviewNotes: string[]
  sourceChapterId?: string
  finalScore: number
  hookScore: number
  aspectRatio: StudioAspectRatio
  platform: StudioClipPlatform
  burnSubtitles: boolean
  status: StudioClipCandidateStatus
  transcriptVersion: number
}

export type StudioShortClip = {
  id: string
  sourceCandidateId?: string
  title: string
  caption: string
  startTime: number
  endTime: number
  duration: number
  status: StudioShortClipStatus
  videoPath: string
  thumbnailPath: string
  aspectRatio: StudioAspectRatio
  platform: StudioClipPlatform
  burnSubtitles: boolean
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
      layer: StudioCanvasLayer
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
  transcriptWords: StudioTranscriptWord[]
  chapters: StudioChapter[]
  clipCandidates: StudioClipCandidate[]
  shortClips: StudioShortClip[]
  generatedAssets: StudioGeneratedAsset[]
  processingJobs: StudioProcessingJob[]
  sourceMedia: StudioSourceMedia
  layers: StudioCanvasLayer[]
  timelineTracks: StudioTimelineTrack[]
}
