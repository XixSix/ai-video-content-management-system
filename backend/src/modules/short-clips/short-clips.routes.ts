import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { validateRequest } from '../../middleware/validate-request'
import * as shortClipsController from './short-clips.controller'
import {
  clipCandidateParamsSchema,
  generateShortClipsSchema,
  listClipCandidatesQuerySchema,
  mediaShortClipParamsSchema
} from './short-clips.schema'

const mediaRouter = Router()
const candidateRouter = Router()

mediaRouter.use(authenticate)
candidateRouter.use(authenticate)

mediaRouter.post(
  '/:mediaId/short-clips/generate',
  validateRequest({ params: mediaShortClipParamsSchema, body: generateShortClipsSchema }),
  shortClipsController.generate
)
mediaRouter.get(
  '/:mediaId/clip-candidates',
  validateRequest({ params: mediaShortClipParamsSchema, query: listClipCandidatesQuerySchema }),
  shortClipsController.listCandidatesByMedia
)

candidateRouter.get(
  '/:candidateId',
  validateRequest({ params: clipCandidateParamsSchema }),
  shortClipsController.getCandidate
)

export { candidateRouter as clipCandidatesRoutes, mediaRouter as mediaShortClipRoutes }
