import { describe, expect, it } from '@jest/globals'
import { MAX_UPLOAD_FILE_SIZE_BYTES } from './media.constants'
import { createUploadUrlSchema } from './media.schema'

const workspaceId = '00000000-0000-4000-8000-000000000001'

describe('media upload schema', () => {
  it.each([
    ['VIDEO', 'recording.mp4', 'video/mp4'],
    ['VIDEO', 'recording.webm', 'video/webm'],
    ['VIDEO', 'recording.mov', 'video/quicktime'],
    ['AUDIO', 'voice.mp3', 'audio/mpeg'],
    ['AUDIO', 'voice.m4a', 'audio/mp4'],
    ['AUDIO', 'voice.wav', 'audio/wav'],
    ['AUDIO', 'voice.flac', 'audio/flac'],
    ['IMAGE', 'cover.jpg', 'image/jpeg'],
    ['IMAGE', 'cover.webp', 'image/webp'],
    ['IMAGE', 'cover.gif', 'image/gif'],
    ['SUBTITLE', 'captions.srt', 'application/x-subrip'],
    ['SUBTITLE', 'captions.srt', 'text/plain'],
    ['SUBTITLE', 'captions.vtt', 'text/vtt'],
    ['SUBTITLE', 'captions.vtt', 'application/octet-stream']
  ])('accepts %s upload %s with %s', (mediaType, originalFilename, mimeType) => {
    const result = createUploadUrlSchema.safeParse({
      workspaceId,
      mediaType,
      originalFilename,
      mimeType,
      fileSizeBytes: 1024
    })

    expect(result.success).toBe(true)
  })

  it('rejects DOCUMENT uploads', () => {
    const result = createUploadUrlSchema.safeParse({
      workspaceId,
      mediaType: 'DOCUMENT',
      originalFilename: 'notes.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 1024
    })

    expect(result.success).toBe(false)
  })

  it('rejects a subtitle MIME that does not match its extension', () => {
    const result = createUploadUrlSchema.safeParse({
      workspaceId,
      mediaType: 'SUBTITLE',
      originalFilename: 'captions.vtt',
      mimeType: 'application/x-subrip',
      fileSizeBytes: 1024
    })

    expect(result.success).toBe(false)
  })

  it('accepts the configured maximum upload size', () => {
    const result = createUploadUrlSchema.safeParse({
      workspaceId,
      mediaType: 'VIDEO',
      originalFilename: 'recording.mp4',
      mimeType: 'video/mp4',
      fileSizeBytes: MAX_UPLOAD_FILE_SIZE_BYTES
    })

    expect(result.success).toBe(true)
  })

  it('rejects file sizes above the configured maximum', () => {
    const result = createUploadUrlSchema.safeParse({
      workspaceId,
      mediaType: 'VIDEO',
      originalFilename: 'recording.mp4',
      mimeType: 'video/mp4',
      fileSizeBytes: MAX_UPLOAD_FILE_SIZE_BYTES + 1
    })

    expect(result.success).toBe(false)
  })
})
