import { z } from 'zod'

export const mediaTranscriptParamsSchema = z.strictObject({
  mediaId: z.uuid()
})

export const transcriptParamsSchema = z.strictObject({
  transcriptId: z.uuid()
})

export const generateTranscriptSchema = z.strictObject({
  language: z.enum(['vi', 'auto']).default('auto'),
  generateSrt: z.boolean().default(true),
  generateVtt: z.boolean().default(true),
  burnTranscript: z.boolean().default(false),
  useVad: z.boolean().default(true),
  sourceSeparation: z.boolean().default(false),
  useDiarization: z.boolean().default(false)
})

export type MediaTranscriptParams = z.infer<typeof mediaTranscriptParamsSchema>
export type TranscriptParams = z.infer<typeof transcriptParamsSchema>
export type GenerateTranscriptBody = z.infer<typeof generateTranscriptSchema>
