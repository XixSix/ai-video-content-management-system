import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { validateRequest } from '../../middleware/validate-request'
import * as shortClipsController from './short-clips.controller'
import {
  clipCandidateParamsSchema,
  generateShortClipsSchema,
  listClipCandidatesQuerySchema,
  listShortClipsQuerySchema,
  mediaShortClipParamsSchema,
  shortClipParamsSchema
} from './short-clips.schema'

const mediaRouter = Router()
const candidateRouter = Router()
const shortClipRouter = Router()

mediaRouter.use(authenticate)
candidateRouter.use(authenticate)
shortClipRouter.use(authenticate)

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
mediaRouter.get(
  '/:mediaId/short-clips',
  validateRequest({ params: mediaShortClipParamsSchema, query: listShortClipsQuerySchema }),
  shortClipsController.listShortClipsByMedia
)

candidateRouter.get(
  '/:candidateId',
  validateRequest({ params: clipCandidateParamsSchema }),
  shortClipsController.getCandidate
)

shortClipRouter.get(
  '/:shortClipId/download-url',
  validateRequest({ params: shortClipParamsSchema }),
  shortClipsController.createShortClipDownloadUrl
)
shortClipRouter.get(
  '/:shortClipId',
  validateRequest({ params: shortClipParamsSchema }),
  shortClipsController.getShortClip
)

export {
  candidateRouter as clipCandidatesRoutes,
  mediaRouter as mediaShortClipRoutes,
  shortClipRouter as shortClipsRoutes
}
