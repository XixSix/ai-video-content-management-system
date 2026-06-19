import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { validateRequest } from '../../middleware/validate-request'
import * as mediaController from './media.controller'
import {
  completeUploadSchema,
  createUploadUrlSchema,
  listMediaQuerySchema,
  mediaParamsSchema,
  updateMediaSchema
} from './media.schema'

const router = Router()

router.use(authenticate)

router.get('/', validateRequest({ query: listMediaQuerySchema }), mediaController.list)
router.post('/upload-url', validateRequest({ body: createUploadUrlSchema }), mediaController.createUploadUrl)
router.post(
  '/:mediaId/complete-upload',
  validateRequest({ params: mediaParamsSchema, body: completeUploadSchema }),
  mediaController.completeUpload
)
router.post('/:mediaId/abort-upload', validateRequest({ params: mediaParamsSchema }), mediaController.abortUpload)
router.get('/:mediaId/download-url', validateRequest({ params: mediaParamsSchema }), mediaController.createDownloadUrl)
router.get('/:mediaId', validateRequest({ params: mediaParamsSchema }), mediaController.get)
router.patch(
  '/:mediaId',
  validateRequest({ params: mediaParamsSchema, body: updateMediaSchema }),
  mediaController.update
)
router.delete('/:mediaId', validateRequest({ params: mediaParamsSchema }), mediaController.remove)

export { router as mediaRoutes }
