import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { validateRequest } from '../../middleware/validate-request'
import * as workspaceController from './workspace.controller'
import { workspaceParamsSchema } from './workspace.schema'

const router = Router()

router.use(authenticate)

router.get('/', workspaceController.list)
router.put(
  '/:workspaceId/preferred',
  validateRequest({ params: workspaceParamsSchema }),
  workspaceController.setPreferred
)
router.get('/:workspaceId', validateRequest({ params: workspaceParamsSchema }), workspaceController.getDetails)
router.get('/:workspaceId/members', validateRequest({ params: workspaceParamsSchema }), workspaceController.listMembers)

export { router as workspaceRoutes }
