import type { RequestHandler } from 'express'
import { AuthError } from '../modules/auth/auth.error'
import * as workspaceService from '../modules/workspace/workspace.service'
import { WorkspaceError } from '../modules/workspace/workspace.error'

export const requireWorkspaceMembership: RequestHandler<{ workspaceId: string }> = async (
  req,
  _res,
  next
): Promise<void> => {
  try {
    if (!req.user) {
      throw AuthError.unauthorized('Authentication is required')
    }

    req.workspace = await workspaceService.getWorkspaceMembershipContext(req.params.workspaceId, req.user.id)
    next()
  } catch (error: unknown) {
    next(error)
  }
}

export const requireWorkspaceOwner: RequestHandler = (req, _res, next): void => {
  if (req.workspace?.role !== 'OWNER') {
    next(WorkspaceError.ownerRequired())
    return
  }

  next()
}
