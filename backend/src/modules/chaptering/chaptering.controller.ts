import type { ParamsBodyRequestHandler, ParamsRequestHandler } from '../../types/express'
import { sendSuccess } from '../../utils/response'
import type { GenerateChaptersBody, MediaChapterParams } from './chaptering.schema'
import * as chapteringService from './chaptering.service'
import type { ChapterData, GenerateChaptersResult, GenerateChaptersServiceResult } from './chaptering.types'

export const generate: ParamsBodyRequestHandler<MediaChapterParams, GenerateChaptersBody> = async (
  req,
  res,
  next
): Promise<void> => {
  try {
    const result: GenerateChaptersServiceResult = await chapteringService.generateChapters({
      userId: req.user!.id,
      mediaId: req.params.mediaId,
      ...req.body
    })
    const response: GenerateChaptersResult = { job: result.job }

    sendSuccess<GenerateChaptersResult>(res, response, result.wasCreated ? 201 : 200)
  } catch (error: unknown) {
    next(error)
  }
}

export const listByMedia: ParamsRequestHandler<MediaChapterParams> = async (req, res, next): Promise<void> => {
  try {
    const chapters = await chapteringService.listMediaChapters(req.user!.id, req.params.mediaId)

    sendSuccess<{ chapters: ChapterData[] }>(res, { chapters })
  } catch (error: unknown) {
    next(error)
  }
}
