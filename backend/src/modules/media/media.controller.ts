import type { BodyRequestHandler } from '../../types/express'
import { sendSuccess } from '../../utils/response'
import type { AbortMultipartUploadBody, CompleteUploadBody, CreateUploadUrlBody } from './media.schema'
import * as mediaService from './media.service'
import type {
  AbortMultipartUploadResult,
  CompleteUploadResult,
  CompleteUploadResponseData,
  CreateUploadUrlResult
} from '../../types/media'
import { toUploadedMediaResponse } from '../../utils/media.util'

export const createUploadUrl: BodyRequestHandler<CreateUploadUrlBody> = async (req, res, next): Promise<void> => {
  try {
    const result: CreateUploadUrlResult = await mediaService.createUploadUrl({
      userId: req.user!.id,
      mediaType: req.body.mediaType,
      originalFilename: req.body.originalFilename,
      mimeType: req.body.mimeType,
      fileSizeBytes: req.body.fileSizeBytes,
      title: req.body.title,
      description: req.body.description
    })

    sendSuccess<CreateUploadUrlResult>(res, result, 201)
  } catch (error: unknown) {
    next(error)
  }
}

export const completeUpload: BodyRequestHandler<CompleteUploadBody> = async (req, res, next): Promise<void> => {
  try {
    const result: CompleteUploadResult = await mediaService.completeUpload({
      userId: req.user!.id,
      mediaId: req.body.mediaId,
      parts: req.body.parts
    })

    sendSuccess<CompleteUploadResponseData>(
      res,
      {
        media: toUploadedMediaResponse(result.media)
      },
      201
    )
  } catch (error: unknown) {
    next(error)
  }
}

export const abortMultipartUpload: BodyRequestHandler<AbortMultipartUploadBody> = async (
  req,
  res,
  next
): Promise<void> => {
  try {
    const result: AbortMultipartUploadResult = await mediaService.abortMultipartUpload({
      userId: req.user!.id,
      bucket: req.body.bucket,
      key: req.body.key,
      multipartUploadId: req.body.multipartUploadId
    })

    sendSuccess<AbortMultipartUploadResult>(res, result)
  } catch (error: unknown) {
    next(error)
  }
}
