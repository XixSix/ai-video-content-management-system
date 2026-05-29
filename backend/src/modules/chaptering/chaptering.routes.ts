import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { validateRequest } from '../../middleware/validate-request'
import * as chapteringController from './chaptering.controller'
import { generateChaptersSchema, mediaChapterParamsSchema } from './chaptering.schema'

export const mediaChapterRoutes = Router()

mediaChapterRoutes.use(authenticate)

mediaChapterRoutes.post(
  '/:mediaId/chapters/generate',
  validateRequest({ params: mediaChapterParamsSchema, body: generateChaptersSchema }),
  chapteringController.generate
)
mediaChapterRoutes.get(
  '/:mediaId/chapters',
  validateRequest({ params: mediaChapterParamsSchema }),
  chapteringController.listByMedia
)
