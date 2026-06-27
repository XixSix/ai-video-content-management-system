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

export const generateShortClipsSchema = z.strictObject({
  clipCount: z.coerce.number().int().min(1).max(10).default(3),
  clipLength: z.enum(['AUTO', '15_30', '30_60', '60_90']).default('AUTO'),
  minDuration: z.coerce.number().min(5).max(180).optional(),
  maxDuration: z.coerce.number().min(5).max(180).optional(),
  aspectRatio: z.enum(['9:16', '1:1', '16:9']).default('9:16'),
  language: z.enum(['AUTO', 'ENGLISH', 'VIETNAMESE']).default('AUTO'),
  genre: z.enum(['AUTO', 'PODCAST', 'INTERVIEW', 'TUTORIAL', 'WEBINAR']).default('AUTO'),
  clipModel: z.enum(['AUTO', 'BALANCED', 'VIRAL_HOOKS']).default('AUTO'),
  autoHook: z.boolean().default(true),
  prompt: z.string().trim().max(1000).default(''),
  captionPresetId: z.string().trim().min(1).max(100).default('karaoke'),
  burnSubtitle: z.boolean().default(true),
  transcriptId: z.uuid().optional()
})

export const listClipCandidatesQuerySchema = z.strictObject({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
  status: z.enum(ClipCandidateStatus).optional(),
  transcriptId: z.uuid().optional(),
  chapterId: z.uuid().optional(),
  jobId: z.uuid().optional(),
  sortBy: z.enum(['score', 'createdAt', 'startTime', 'duration']).default('score'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

export const listShortClipsQuerySchema = z.strictObject({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
  status: z.enum(ShortClipStatus).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

export type MediaShortClipParams = z.infer<typeof mediaShortClipParamsSchema>
export type ClipCandidateParams = z.infer<typeof clipCandidateParamsSchema>
export type ShortClipParams = z.infer<typeof shortClipParamsSchema>
export type GenerateShortClipsBody = z.infer<typeof generateShortClipsSchema>
export type ListClipCandidatesQuery = z.infer<typeof listClipCandidatesQuerySchema>
export type ListShortClipsQuery = z.infer<typeof listShortClipsQuerySchema>
