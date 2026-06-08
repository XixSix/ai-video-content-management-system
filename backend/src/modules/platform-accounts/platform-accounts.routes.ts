import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { validateRequest } from '../../middleware/validate-request'
import * as platformAccountsController from './platform-accounts.controller'
import { platformOAuthCallbackQuerySchema, platformParamsSchema } from './platform-accounts.schema'

const router = Router()

router.get(
  '/:platform/callback',
  validateRequest({ params: platformParamsSchema, query: platformOAuthCallbackQuerySchema }),
  platformAccountsController.callback
)

router.use(authenticate)

router.get('/', platformAccountsController.list)
router.post('/:platform/connect', validateRequest({ params: platformParamsSchema }), platformAccountsController.connect)
router.delete('/:platform', validateRequest({ params: platformParamsSchema }), platformAccountsController.disconnect)

export { router as platformAccountsRoutes }
