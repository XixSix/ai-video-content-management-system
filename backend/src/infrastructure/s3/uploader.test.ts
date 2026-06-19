import { describe, expect, it } from '@jest/globals'
import { createAttachmentContentDisposition } from './uploader'

describe('createAttachmentContentDisposition', () => {
  it('includes an ASCII fallback and an RFC 5987 UTF-8 filename', () => {
    expect(createAttachmentContentDisposition('video tiếng Việt.mp4')).toBe(
      `attachment; filename="video ti_ng Vi_t.mp4"; filename*=UTF-8''video%20ti%E1%BA%BFng%20Vi%E1%BB%87t.mp4`
    )
  })

  it('removes path separators and header-breaking characters', () => {
    expect(createAttachmentContentDisposition('../bad\\name"\r\n.mp4')).toBe(
      `attachment; filename=".._bad_name___.mp4"; filename*=UTF-8''.._bad_name%22__.mp4`
    )
  })
})
