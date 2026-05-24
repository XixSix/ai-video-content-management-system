export interface CompletedUploadPart {
  partNumber: number
  etag: string
}

export interface PresignedUploadPart {
  partNumber: number
  url: string
}

export interface StorageObjectMetadata {
  contentLength?: number
  contentType?: string
  etag?: string
}
