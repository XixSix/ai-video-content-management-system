export type ChapterData = {
  id: string
  mediaId: string
  transcriptId: string
  jobId: string | null
  chapterIndex: number
  startTime: number
  endTime: number
  title: string
  transcriptVersion: number
  version: number
  isEdited: boolean
  source: string
  score: number | null
  boundaryScore: number | null
  pauseScore: number | null
  discourseMarkerScore: number | null
  semanticShiftScore: number | null
  lexicalShiftScore: number | null
  valleyDepthScore: number | null
  boundaryQualityScore: number | null
  durationScore: number | null
  llmConfidenceScore: number | null
  createdAt: string
  updatedAt: string
}

export type GenerateChaptersInput = {
  minChapterDuration?: number
  targetChapterDuration?: number
  maxChapters?: number
  useLlm?: boolean
  useEmbeddings?: boolean
}
