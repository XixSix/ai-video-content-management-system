import { z } from 'zod'
import { MediaStatus } from '../../infrastructure/db/generated/prisma/client'
import { MAX_UPLOAD_FILE_SIZE_BYTES } from './media.constants'

export const mediaTypeSchema = z.enum(['VIDEO', 'AUDIO', 'IMAGE', 'SUBTITLE'])

export const listMediaQuerySchema = z.strictObject({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
  status: z.enum(MediaStatus).optional(),
  sortBy: z.enum(['createdAt', 'title', 'duration']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

export const mediaParamsSchema = z.strictObject({
  mediaId: z.uuid()
})

export const createUploadUrlSchema = z
  .strictObject({
    workspaceId: z.uuid(),
    mediaType: mediaTypeSchema,
    originalFilename: z.string().trim().min(1).max(255),
    mimeType: z.string().trim().min(1).max(100),
    fileSizeBytes: z.number().int().positive().max(MAX_UPLOAD_FILE_SIZE_BYTES),
    title: z.string().trim().min(1).max(255).optional(),
    description: z.string().trim().min(1).optional()
  })
  .refine((value) => isValidMediaFile(value.mediaType, value.mimeType, value.originalFilename), {
    message: 'mimeType or file extension does not match mediaType',
    path: ['mimeType']
  })

const completedUploadPartSchema = z.strictObject({
  partNumber: z.number().int().positive(),
  etag: z.string().trim().min(1)
})

export const completeUploadSchema = z
  .strictObject({
    parts: z.array(completedUploadPartSchema).optional()
  })
  .default({})

export const updateMediaSchema = z
  .strictObject({
    title: z.string().trim().min(1).max(255).nullable().optional(),
    description: z.string().trim().min(1).nullable().optional()
  })
  .refine((value) => Object.hasOwn(value, 'title') || Object.hasOwn(value, 'description'), {
    message: 'At least one field is required'
  })

const mediaFileAllowlist = {
  VIDEO: {
    extensions: ['.mp4', '.webm', '.mov'],
    mimeTypes: ['video/mp4', 'video/webm', 'video/quicktime']
  },
  AUDIO: {
    extensions: ['.mp3', '.mp4', '.m4a', '.wav', '.webm', '.ogg', '.flac'],
    mimeTypes: [
      'audio/mpeg',
      'audio/mp4',
      'audio/x-m4a',
      'audio/wav',
      'audio/x-wav',
      'audio/webm',
      'audio/ogg',
      'audio/flac',
      'audio/x-flac'
    ]
  },
  IMAGE: {
    extensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  },
  SUBTITLE: {
    extensions: ['.srt', '.vtt'],
    mimeTypes: ['application/x-subrip', 'application/octet-stream', 'text/plain', 'text/srt', 'text/vtt']
  }
} as const

const getExtension = (filename: string): string => {
  const name = filename.split(/[\\/]/).pop() ?? filename
  const extensionIndex = name.lastIndexOf('.')

  return extensionIndex >= 0 ? name.slice(extensionIndex).toLowerCase() : ''
}

const isValidMediaFile = (
  mediaType: z.infer<typeof mediaTypeSchema>,
  mimeType: string,
  originalFilename: string
): boolean => {
  const allowed = mediaFileAllowlist[mediaType]
  const extension = getExtension(originalFilename)
  const normalizedMimeType = mimeType.toLowerCase()

  if (!allowed.extensions.some((value: string): boolean => value === extension)) {
    return false
  }

  if (!allowed.mimeTypes.some((value: string): boolean => value === normalizedMimeType)) {
    return false
  }

  if (mediaType !== 'SUBTITLE') {
    return true
  }

  if (extension === '.vtt') {
    return ['application/octet-stream', 'text/plain', 'text/vtt'].includes(normalizedMimeType)
  }

  return ['application/octet-stream', 'application/x-subrip', 'text/plain', 'text/srt'].includes(normalizedMimeType)
}

export type CreateUploadUrlBody = z.infer<typeof createUploadUrlSchema>
export type CompleteUploadBody = z.infer<typeof completeUploadSchema>
export type ListMediaQuery = z.infer<typeof listMediaQuerySchema>
export type MediaParams = z.infer<typeof mediaParamsSchema>
export type UpdateMediaBody = z.infer<typeof updateMediaSchema>
