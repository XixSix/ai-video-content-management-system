import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { validateRequest } from '../../middleware/validate-request'
import { requireWorkspaceMembership } from '../../middleware/workspace.middleware'
import { workspaceParamsSchema } from '../workspace/workspace.schema'
import * as renderExportsController from './render-exports.controller'
import { renderExportParamsSchema } from './render-exports.schema'

const router = Router({ mergeParams: true })

router.use(authenticate)
router.use(validateRequest({ params: workspaceParamsSchema }))
router.use(requireWorkspaceMembership)

router.post(
  '/:projectId/export-render',
  validateRequest({ params: renderExportParamsSchema }),
  renderExportsController.create
)

export { router as renderExportsRoutes }
