import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { transcriptGenerateRateLimiter } from '../../middleware/transcript-rate-limit.middleware'
import { validateRequest } from '../../middleware/validate-request'
import * as transcriptsController from './transcripts.controller'
import { generateTranscriptSchema, mediaTranscriptParamsSchema, transcriptParamsSchema } from './transcripts.schema'

const mediaRouter = Router()
const transcriptRouter = Router()

mediaRouter.use(authenticate)
transcriptRouter.use(authenticate)

mediaRouter.post(
  '/:mediaId/transcripts/generate',
  transcriptGenerateRateLimiter,
  validateRequest({ params: mediaTranscriptParamsSchema, body: generateTranscriptSchema }),
  transcriptsController.generate
)
mediaRouter.get(
  '/:mediaId/transcripts',
  validateRequest({ params: mediaTranscriptParamsSchema }),
  transcriptsController.listByMedia
)

transcriptRouter.get('/:transcriptId', validateRequest({ params: transcriptParamsSchema }), transcriptsController.get)
transcriptRouter.get(
  '/:transcriptId/segments',
  validateRequest({ params: transcriptParamsSchema }),
  transcriptsController.segments
)

export { mediaRouter as mediaTranscriptRoutes, transcriptRouter as transcriptsRoutes }
