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

const transcriptEditorBlockSchema = z
  .strictObject({
    blockId: z.string().trim().min(1),
    startTime: z.number().nonnegative(),
    endTime: z.number().nonnegative(),
    text: z.string(),
    sourceSegmentIds: z.array(z.uuid()).min(1),
    sourceWordIds: z.array(z.uuid()).default([])
  })
  .refine((block) => block.startTime < block.endTime, {
    message: 'startTime must be less than endTime',
    path: ['endTime']
  })

export const saveTranscriptEditorDraftSchema = z.strictObject({
  baseTranscriptVersion: z.number().int().positive(),
  clientSequence: z.number().int().nonnegative(),
  blocks: z.array(transcriptEditorBlockSchema)
})

export type MediaTranscriptParams = z.infer<typeof mediaTranscriptParamsSchema>
export type TranscriptParams = z.infer<typeof transcriptParamsSchema>
export type GenerateTranscriptBody = z.infer<typeof generateTranscriptSchema>
export type ExportTranscriptBody = z.infer<typeof exportTranscriptSchema>
export type BurnTranscriptBody = z.infer<typeof burnTranscriptSchema>
export type SaveTranscriptEditorDraftBody = z.infer<typeof saveTranscriptEditorDraftSchema>
