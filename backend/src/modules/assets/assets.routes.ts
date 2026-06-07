import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { validateRequest } from '../../middleware/validate-request'
import * as assetsController from './assets.controller'
import { assetParamsSchema, listAssetsQuerySchema } from './assets.schema'

const router = Router()

router.use(authenticate)

router.get('/', validateRequest({ query: listAssetsQuerySchema }), assetsController.list)
router.get('/:assetId/download-url', validateRequest({ params: assetParamsSchema }), assetsController.createDownloadUrl)
router.delete('/:assetId', validateRequest({ params: assetParamsSchema }), assetsController.remove)

export { router as assetsRoutes }
