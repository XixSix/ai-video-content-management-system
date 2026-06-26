export type TranscriptSummaryData = {
  id: string
  mediaId: string
  jobId: string | null
  language: string | null
  source: string
  asrModel: string | null
  modelSize: string | null
  fullTextPreview: string | null
  wordCount: number | null
  isEdited: boolean
  version: number
  fullTextUpdatedAt: string | null
  createdAt: string
  updatedAt: string
}

export type TranscriptSegmentData = {
  id: string
  transcriptId: string
  mediaId: string
  segmentIndex: number
  startTime: number
  endTime: number
  text: string
  cleanText: string | null
  confidence: number | null
  speakerLabel: string | null
  createdAt: string
}

export type TranscriptWordData = {
  id: string
  transcriptId: string
  segmentId: string
  mediaId: string
  wordIndex: number
  segmentWordIndex: number
  startTime: number
  endTime: number
  text: string
  cleanText: string | null
  confidence: number | null
  speakerLabel: string | null
  createdAt: string
}

export type TranscriptEditorData = {
  transcript: {
    id: string
    mediaId: string
    version: number
    isEdited: boolean
    language: string | null
  }
  segments: TranscriptSegmentData[]
  words: TranscriptWordData[]
  draft: {
    id: string
    baseTranscriptVersion: number
    revision: number
    clientSequence: number
    blocks: Array<{
      blockId: string
      startTime: number
      endTime: number
      text: string
      sourceSegmentIds: string[]
      sourceWordIds: string[]
    }>
  } | null
}

export type GenerateTranscriptInput = {
  language?: "auto" | "en"
  useVad?: boolean
  sourceSeparation?: boolean
  useDiarization?: boolean
}

export type ExportTranscriptFormat = "json" | "txt" | "srt" | "vtt"

export type ExportTranscriptInput = {
  format: ExportTranscriptFormat
}

export type SaveTranscriptEditorDraftInput = {
  baseTranscriptVersion: number
  clientSequence: number
  blocks: NonNullable<TranscriptEditorData["draft"]>["blocks"]
}
