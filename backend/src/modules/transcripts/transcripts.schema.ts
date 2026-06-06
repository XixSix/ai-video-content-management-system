import { z } from 'zod'

export const mediaTranscriptParamsSchema = z.strictObject({
  mediaId: z.uuid()
})

export const transcriptParamsSchema = z.strictObject({
  transcriptId: z.uuid()
})

export const generateTranscriptSchema = z.strictObject({
  language: z.enum(['auto', 'en']).default('auto'),
  useVad: z.boolean().default(true),
  sourceSeparation: z.boolean().default(false),
  useDiarization: z.boolean().default(false)
})

export const exportTranscriptSchema = z.strictObject({
  format: z.enum(['json', 'txt', 'srt', 'vtt'])
})

export const burnTranscriptSchema = z.strictObject({})

export type MediaTranscriptParams = z.infer<typeof mediaTranscriptParamsSchema>
export type TranscriptParams = z.infer<typeof transcriptParamsSchema>
export type GenerateTranscriptBody = z.infer<typeof generateTranscriptSchema>
export type ExportTranscriptBody = z.infer<typeof exportTranscriptSchema>
export type BurnTranscriptBody = z.infer<typeof burnTranscriptSchema>
