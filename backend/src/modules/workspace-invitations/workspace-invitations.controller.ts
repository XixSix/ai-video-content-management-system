import type { ParamsBodyRequestHandler, ParamsRequestHandler } from '../../types/express'
import { sendSuccess } from '../../utils/response'
import type {
  CreateWorkspaceInvitationBody,
  WorkspaceInvitationCreateParams,
  WorkspaceInvitationParams
} from './workspace-invitations.schema'
import * as invitationsService from './workspace-invitations.service'
import type { WorkspaceInvitationData } from './workspace-invitations.types'

export const create: ParamsBodyRequestHandler<WorkspaceInvitationCreateParams, CreateWorkspaceInvitationBody> = async (
  req,
  res,
  next
): Promise<void> => {
  try {
    const invitation = await invitationsService.createWorkspaceInvitation(
      req.params.workspaceId,
      req.user!.id,
      req.body
    )

    sendSuccess<{ invitation: WorkspaceInvitationData }>(res, { invitation }, 201)
  } catch (error: unknown) {
    next(error)
  }
}

export const accept: ParamsRequestHandler<WorkspaceInvitationParams> = async (req, res, next): Promise<void> => {
  try {
    const invitation = await invitationsService.acceptWorkspaceInvitation(req.params.invitationId, req.user!.id)
    sendSuccess<{ invitation: WorkspaceInvitationData }>(res, { invitation })
  } catch (error: unknown) {
    next(error)
  }
}

export const decline: ParamsRequestHandler<WorkspaceInvitationParams> = async (req, res, next): Promise<void> => {
  try {
    const invitation = await invitationsService.declineWorkspaceInvitation(req.params.invitationId, req.user!.id)
    sendSuccess<{ invitation: WorkspaceInvitationData }>(res, { invitation })
  } catch (error: unknown) {
    next(error)
  }
}
