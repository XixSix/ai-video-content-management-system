import type { ParamsBodyRequestHandler, ParamsQueryRequestHandler, ParamsRequestHandler } from '../../types/express'
import { sendSuccess } from '../../utils/response'
import type {
  ClipCandidateParams,
  GenerateShortClipsBody,
  ListClipCandidatesQuery,
  MediaShortClipParams
} from './short-clips.schema'
import * as shortClipsService from './short-clips.service'
import type {
  ClipCandidateData,
  GenerateShortClipsResult,
  GenerateShortClipsServiceResult,
  PaginatedResult
} from './short-clips.types'

export const generate: ParamsBodyRequestHandler<MediaShortClipParams, GenerateShortClipsBody> = async (
  req,
  res,
  next
): Promise<void> => {
  try {
    const result: GenerateShortClipsServiceResult = await shortClipsService.generateShortClips({
      userId: req.user!.id,
      mediaId: req.params.mediaId
    })
    const response: GenerateShortClipsResult = { job: result.job }

    sendSuccess<GenerateShortClipsResult>(res, response, result.wasCreated ? 201 : 200)
  } catch (error: unknown) {
    next(error)
  }
}

export const listCandidatesByMedia: ParamsQueryRequestHandler<MediaShortClipParams, ListClipCandidatesQuery> = async (
  req,
  res,
  next
): Promise<void> => {
  try {
    const query = req.query as ListClipCandidatesQuery
    const result = await shortClipsService.listClipCandidates(req.user!.id, req.params.mediaId, query)

    sendSuccess<{ items: ClipCandidateData[]; meta: Omit<PaginatedResult<never>, 'items'> }>(res, {
      items: result.items,
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

export const getCandidate: ParamsRequestHandler<ClipCandidateParams> = async (req, res, next): Promise<void> => {
  try {
    const candidate = await shortClipsService.getClipCandidate(req.user!.id, req.params.candidateId)

    sendSuccess<{ candidate: ClipCandidateData }>(res, { candidate })
  } catch (error: unknown) {
    next(error)
  }
}
