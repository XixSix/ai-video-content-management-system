import { z } from 'zod'
import { ClipCandidateStatus, ShortClipStatus } from '../../infrastructure/db/generated/prisma/client'

export const mediaShortClipParamsSchema = z.strictObject({
  mediaId: z.uuid()
})

export const clipCandidateParamsSchema = z.strictObject({
  candidateId: z.uuid()
})

export const shortClipParamsSchema = z.strictObject({
  shortClipId: z.uuid()
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

export const listShortClipsQuerySchema = z.strictObject({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
  status: z.enum(ShortClipStatus).optional(),
  sortBy: z.enum(['createdAt', 'startTime', 'duration', 'score']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

export type MediaShortClipParams = z.infer<typeof mediaShortClipParamsSchema>
export type ClipCandidateParams = z.infer<typeof clipCandidateParamsSchema>
export type ShortClipParams = z.infer<typeof shortClipParamsSchema>
export type GenerateShortClipsBody = z.infer<typeof generateShortClipsSchema>
export type ListClipCandidatesQuery = z.infer<typeof listClipCandidatesQuerySchema>
export type ListShortClipsQuery = z.infer<typeof listShortClipsQuerySchema>
