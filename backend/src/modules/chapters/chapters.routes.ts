import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { validateRequest } from '../../middleware/validate-request'
import * as chaptersController from './chapters.controller'
import { generateChaptersSchema, mediaChapterParamsSchema } from './chapters.schema'

export const mediaChapterRoutes = Router()

mediaChapterRoutes.use(authenticate)

mediaChapterRoutes.post(
  '/:mediaId/chapters/generate',
  validateRequest({ params: mediaChapterParamsSchema, body: generateChaptersSchema }),
  chaptersController.generate
)
mediaChapterRoutes.get(
  '/:mediaId/chapters',
  validateRequest({ params: mediaChapterParamsSchema }),
  chaptersController.listByMedia
)
