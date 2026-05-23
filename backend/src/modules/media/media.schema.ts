import { z } from 'zod'

export const mediaTypeSchema = z.enum(['VIDEO', 'IMAGE'])

export const createUploadUrlSchema = z
  .strictObject({
    mediaType: mediaTypeSchema,
    originalFilename: z.string().trim().min(1).max(255),
    mimeType: z.string().trim().min(1).max(100),
    fileSizeBytes: z.number().int().positive(),
    title: z.string().trim().min(1).max(255).optional(),
    description: z.string().trim().min(1).optional()
  })
  .refine((value) => isValidMimeTypeForMedia(value.mediaType, value.mimeType), {
    message: 'mimeType does not match mediaType',
    path: ['mimeType']
  })

const completedUploadPartSchema = z.strictObject({
  partNumber: z.number().int().positive(),
  etag: z.string().trim().min(1)
})

export const completeUploadSchema = z.strictObject({
  mediaId: z.uuid(),
  parts: z.array(completedUploadPartSchema).optional()
})

export const abortMultipartUploadSchema = z.strictObject({
  bucket: z.string().trim().min(1),
  key: z.string().trim().min(1),
  multipartUploadId: z.string().trim().min(1)
})

const isValidMimeTypeForMedia = (mediaType: 'VIDEO' | 'IMAGE', mimeType: string): boolean => {
  if (mediaType === 'VIDEO') {
    return mimeType === 'video/mp4'
  }

  return ['image/png', 'image/jpeg', 'image/webp'].includes(mimeType)
}

export type CreateUploadUrlBody = z.infer<typeof createUploadUrlSchema>
export type CompleteUploadBody = z.infer<typeof completeUploadSchema>
export type AbortMultipartUploadBody = z.infer<typeof abortMultipartUploadSchema>
