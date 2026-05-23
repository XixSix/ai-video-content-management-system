import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { validateRequest } from '../../middleware/validate-request'
import * as mediaController from './media.controller'
import { abortMultipartUploadSchema, completeUploadSchema, createUploadUrlSchema } from './media.schema'

const router = Router()

router.post(
  '/upload-url',
  authenticate,
  validateRequest({ body: createUploadUrlSchema }),
  mediaController.createUploadUrl
)
router.post(
  '/complete-upload',
  authenticate,
  validateRequest({ body: completeUploadSchema }),
  mediaController.completeUpload
)
router.post(
  '/abort-upload',
  authenticate,
  validateRequest({ body: abortMultipartUploadSchema }),
  mediaController.abortMultipartUpload
)

export { router as mediaRoutes }
