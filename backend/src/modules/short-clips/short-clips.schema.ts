import { z } from 'zod'
import { ClipCandidateStatus } from '../../infrastructure/db/generated/prisma/client'

export const mediaShortClipParamsSchema = z.strictObject({
  mediaId: z.uuid()
})

export const clipCandidateParamsSchema = z.strictObject({
  candidateId: z.uuid()
})

export const generateShortClipsSchema = z.strictObject({})

export const listClipCandidatesQuerySchema = z.strictObject({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
  status: z.enum(ClipCandidateStatus).optional(),
  transcriptId: z.uuid().optional(),
  chapterId: z.uuid().optional(),
  jobId: z.uuid().optional(),
  sortBy: z.enum(['finalScore', 'createdAt', 'startTime', 'duration']).default('finalScore'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

export type MediaShortClipParams = z.infer<typeof mediaShortClipParamsSchema>
export type ClipCandidateParams = z.infer<typeof clipCandidateParamsSchema>
export type GenerateShortClipsBody = z.infer<typeof generateShortClipsSchema>
export type ListClipCandidatesQuery = z.infer<typeof listClipCandidatesQuerySchema>
