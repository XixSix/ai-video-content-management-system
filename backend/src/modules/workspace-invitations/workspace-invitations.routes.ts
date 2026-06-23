import { Router } from 'express'
import { authenticate } from '../../middleware/auth.middleware'
import { validateRequest } from '../../middleware/validate-request'
import { requireWorkspaceMembership, requireWorkspaceOwner } from '../../middleware/workspace.middleware'
import * as invitationsController from './workspace-invitations.controller'
import {
  createWorkspaceInvitationSchema,
  workspaceInvitationCreateParamsSchema,
  workspaceInvitationParamsSchema
} from './workspace-invitations.schema'

const createRouter = Router()
const actionRouter = Router()

createRouter.use(authenticate)
createRouter.post(
  '/:workspaceId/invitations',
  validateRequest({ params: workspaceInvitationCreateParamsSchema }),
  requireWorkspaceMembership,
  requireWorkspaceOwner,
  validateRequest({ body: createWorkspaceInvitationSchema }),
  invitationsController.create
)

actionRouter.use(authenticate)
actionRouter.post(
  '/:invitationId/accept',
  validateRequest({ params: workspaceInvitationParamsSchema }),
  invitationsController.accept
)
actionRouter.post(
  '/:invitationId/decline',
  validateRequest({ params: workspaceInvitationParamsSchema }),
  invitationsController.decline
)

export { actionRouter as workspaceInvitationActionRoutes, createRouter as workspaceInvitationCreateRoutes }
