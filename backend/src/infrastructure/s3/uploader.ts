import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3ServiceException,
  UploadPartCommand,
  DeleteObjectCommand
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { config } from '../../config'
import { MediaError } from '../../modules/media/media.error'
import { presignS3Client, s3Client } from './client'
import type { CompletedUploadPart, PresignedUploadPart, StorageObjectMetadata } from './s3.types'

export const PRESIGNED_UPLOAD_EXPIRES_SECONDS: number = config.upload.presignedUploadExpiredSeconds
export const PRESIGNED_DOWNLOAD_EXPIRES_SECONDS: number = config.upload.presignedDownloadExpiredSeconds

export const createPresignedPutUrl = async (bucket: string, key: string, mimeType: string): Promise<string> => {
  try {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: mimeType
    })

    return await getSignedUrl(presignS3Client, command, {
      expiresIn: config.upload.presignedUploadExpiredSeconds
    })
  } catch (error: unknown) {
    throw toStorageError(error, 'Failed to create upload URL')
  }
}

export const createPresignedGetUrl = async (bucket: string, key: string): Promise<string> => {
  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key
    })

    return await getSignedUrl(presignS3Client, command, {
      expiresIn: config.upload.presignedDownloadExpiredSeconds
    })
  } catch (error: unknown) {
    throw toStorageError(error, 'Failed to create download URL')
  }
}

export const createPresignedPreviewUrl = async (bucket: string, key: string): Promise<string> => {
  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ResponseContentDisposition: 'inline'
    })

    return await getSignedUrl(presignS3Client, command, {
      expiresIn: config.upload.presignedDownloadExpiredSeconds
    })
  } catch (error: unknown) {
    throw toStorageError(error, 'Failed to create preview URL')
  }
}

export const createAttachmentContentDisposition = (filename: string): string => {
  const normalizedFilename = filename.trim().replaceAll(/[/\\\r\n]/g, '_') || 'download'
  const asciiFilename = normalizedFilename.replaceAll(/[^\x20-\x7E"]/g, '_').replaceAll('"', '_')
  const encodedFilename = encodeURIComponent(normalizedFilename).replaceAll(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  )

  return `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`
}

export const createPresignedDownloadUrl = async (bucket: string, key: string, filename: string): Promise<string> => {
  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ResponseContentDisposition: createAttachmentContentDisposition(filename)
    })

    return await getSignedUrl(presignS3Client, command, {
      expiresIn: config.upload.presignedDownloadExpiredSeconds
    })
  } catch (error: unknown) {
    throw toStorageError(error, 'Failed to create download URL')
  }
}

export const createMultipartUpload = async (bucket: string, key: string, mimeType: string): Promise<string> => {
  try {
    const command = new CreateMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      ContentType: mimeType
    })
    const result = await s3Client.send(command)

    if (!result.UploadId) {
      throw MediaError.storageFailure('Storage did not return a multipart upload id')
    }

    return result.UploadId
  } catch (error: unknown) {
    throw toStorageError(error, 'Failed to create multipart upload')
  }
}

export const createPresignedUploadPartUrls = async (
  bucket: string,
  key: string,
  multipartUploadId: string,
  partCount: number
): Promise<PresignedUploadPart[]> => {
  try {
    const partNumbers: number[] = Array.from({ length: partCount }, (_, index) => index + 1)

    return await Promise.all(
      partNumbers.map(async (partNumber): Promise<PresignedUploadPart> => {
        const command = new UploadPartCommand({
          Bucket: bucket,
          Key: key,
          UploadId: multipartUploadId,
          PartNumber: partNumber
        })
        const url: string = await getSignedUrl(presignS3Client, command, {
          expiresIn: config.upload.presignedUploadExpiredSeconds
        })

        return {
          partNumber,
          url
        }
      })
    )
  } catch (error: unknown) {
    throw toStorageError(error, 'Failed to create multipart upload URLs')
  }
}

export const completeMultipartUpload = async (
  bucket: string,
  key: string,
  multipartUploadId: string,
  parts: readonly CompletedUploadPart[]
): Promise<void> => {
  try {
    const sortedParts: CompletedUploadPart[] = [...parts].sort((left, right) => left.partNumber - right.partNumber)
    const command = new CompleteMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      UploadId: multipartUploadId,
      MultipartUpload: {
        Parts: sortedParts.map((part) => ({
          PartNumber: part.partNumber,
          ETag: part.etag
        }))
      }
    })

    await s3Client.send(command)
  } catch (error: unknown) {
    if (isMultipartUploadNotFoundError(error)) {
      throw MediaError.multipartUploadNotFound()
    }

    throw toStorageError(error, 'Failed to complete multipart upload')
  }
}

export const abortMultipartUpload = async (bucket: string, key: string, multipartUploadId: string): Promise<void> => {
  try {
    const command = new AbortMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      UploadId: multipartUploadId
    })

    await s3Client.send(command)
  } catch (error: unknown) {
    if (isMultipartUploadNotFoundError(error)) {
      return
    }

    throw toStorageError(error, 'Failed to abort multipart upload')
  }
}

export const deleteObject = async (bucket: string, key: string): Promise<void> => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key
    })

    await s3Client.send(command)
  } catch (error: unknown) {
    if (isObjectNotFoundError(error)) {
      return
    }

    throw toStorageError(error, 'Failed to delete object')
  }
}

export const headObject = async (bucket: string, key: string): Promise<StorageObjectMetadata> => {
  try {
    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: key
    })
    const result = await s3Client.send(command)

    return {
      contentLength: result.ContentLength,
      contentType: result.ContentType,
      etag: result.ETag
    }
  } catch (error: unknown) {
    if (isObjectNotFoundError(error)) {
      throw MediaError.invalidUpload('Uploaded object was not found')
    }

    throw toStorageError(error, 'Failed to inspect uploaded object')
  }
}

const isObjectNotFoundError = (error: unknown): boolean => {
  if (!(error instanceof S3ServiceException)) {
    return false
  }

  return error.name === 'NotFound' || error.name === 'NoSuchKey' || error.$metadata.httpStatusCode === 404
}

const isMultipartUploadNotFoundError = (error: unknown): boolean =>
  error instanceof S3ServiceException &&
  (error.name === 'NoSuchUpload' || (error.$metadata.httpStatusCode === 404 && error.name === 'NotFound'))

const toStorageError = (error: unknown, fallbackMessage: string): MediaError => {
  if (error instanceof MediaError) {
    return error
  }

  if (error instanceof S3ServiceException) {
    return MediaError.storageFailure(error.message || fallbackMessage)
  }

  return MediaError.storageFailure(fallbackMessage)
}
