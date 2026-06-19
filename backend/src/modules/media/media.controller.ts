import type {
  BodyRequestHandler,
  ParamsBodyRequestHandler,
  ParamsRequestHandler,
  QueryRequestHandler
} from '../../types/express'
import { sendSuccess } from '../../utils/response'
import type {
  CompleteUploadBody,
  CreateUploadUrlBody,
  ListMediaQuery,
  MediaParams,
  UpdateMediaBody
} from './media.schema'
import * as mediaService from './media.service'
import type {
  AbortUploadResult,
  CompleteUploadResult,
  CompleteUploadResponseData,
  CreateUploadUrlResult,
  CreateDownloadUrlResult,
  MediaResponseData,
  PaginatedResult
} from './media.types'
import { toMediaResponseData } from './media.util'

export const list: QueryRequestHandler<ListMediaQuery> = async (req, res, next): Promise<void> => {
  try {
    const query = req.query as ListMediaQuery
    const result = await mediaService.listMedia(req.user!.id, query)

    sendSuccess<{ items: MediaResponseData[]; meta: Omit<PaginatedResult<never>, 'items'> }>(res, {
      items: result.items.map(toMediaResponseData),
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages
      }
    })
  } catch (error: unknown) {
    next(error)
  }
}

export const get: ParamsRequestHandler<MediaParams> = async (req, res, next): Promise<void> => {
  try {
    const media = await mediaService.getMedia(req.user!.id, req.params.mediaId)

    sendSuccess<{ media: MediaResponseData }>(res, {
      media: toMediaResponseData(media)
    })
  } catch (error: unknown) {
    next(error)
  }
}

export const update: ParamsBodyRequestHandler<MediaParams, UpdateMediaBody> = async (req, res, next): Promise<void> => {
  try {
    const media = await mediaService.updateMedia(req.user!.id, req.params.mediaId, req.body)

    sendSuccess<{ media: MediaResponseData }>(res, {
      media: toMediaResponseData(media)
    })
  } catch (error: unknown) {
    next(error)
  }
}

export const remove: ParamsRequestHandler<MediaParams> = async (req, res, next): Promise<void> => {
  try {
    await mediaService.deleteMedia(req.user!.id, req.params.mediaId)

    sendSuccess<{ message: string }>(res, {
      message: 'Media deleted successfully'
    })
  } catch (error: unknown) {
    next(error)
  }
}

export const createDownloadUrl: ParamsRequestHandler<MediaParams> = async (req, res, next): Promise<void> => {
  try {
    const result: CreateDownloadUrlResult = await mediaService.createDownloadUrl(req.user!.id, req.params.mediaId)

    sendSuccess<CreateDownloadUrlResult>(res, result)
  } catch (error: unknown) {
    next(error)
  }
}

export const createUploadUrl: BodyRequestHandler<CreateUploadUrlBody> = async (req, res, next): Promise<void> => {
  try {
    const result: CreateUploadUrlResult = await mediaService.createUploadUrl({
      userId: req.user!.id,
      workspaceId: req.body.workspaceId,
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

export const completeUpload: ParamsBodyRequestHandler<MediaParams, CompleteUploadBody> = async (
  req,
  res,
  next
): Promise<void> => {
  try {
    const result: CompleteUploadResult = await mediaService.completeUpload({
      userId: req.user!.id,
      mediaId: req.params.mediaId,
      parts: req.body.parts
    })

    sendSuccess<CompleteUploadResponseData>(
      res,
      {
        media: toMediaResponseData(result.media)
      },
      200
    )
  } catch (error: unknown) {
    next(error)
  }
}

export const abortUpload: ParamsRequestHandler<MediaParams> = async (req, res, next): Promise<void> => {
  try {
    const result: AbortUploadResult = await mediaService.abortUpload(req.user!.id, req.params.mediaId)

    sendSuccess<AbortUploadResult>(res, result)
  } catch (error: unknown) {
    next(error)
  }
}
