import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { validateRequest } from '../../middleware/validate-request'
import { requireWorkspaceMembership, requireWorkspaceOwner } from '../../middleware/workspace.middleware'
import { workspaceParamsSchema } from '../workspace/workspace.schema'
import * as platformAccountsController from './platform-accounts.controller'
import { platformParamsSchema, workspacePlatformParamsSchema } from './platform-accounts.schema'

const callbackRouter = Router()
const workspaceRouter = Router({ mergeParams: true })

callbackRouter.get(
  '/:platform/callback',
  validateRequest({ params: platformParamsSchema }),
  platformAccountsController.callback
)

workspaceRouter.use(authenticate)
workspaceRouter.use(validateRequest({ params: workspaceParamsSchema }))
workspaceRouter.use(requireWorkspaceMembership)

workspaceRouter.get('/', platformAccountsController.list)
workspaceRouter.post(
  '/:platform/connect',
  validateRequest({ params: workspacePlatformParamsSchema }),
  requireWorkspaceOwner,
  platformAccountsController.connect
)
workspaceRouter.delete(
  '/:platform',
  validateRequest({ params: workspacePlatformParamsSchema }),
  requireWorkspaceOwner,
  platformAccountsController.disconnect
)

export { callbackRouter as platformAccountsCallbackRoutes, workspaceRouter as workspacePlatformAccountsRoutes }
