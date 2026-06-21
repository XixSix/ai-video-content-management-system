import type { ParamsRequestHandler } from '../../types/express'
import { sendSuccess } from '../../utils/response'
import type { WorkspaceParams } from './workspace.schema'
import * as workspaceService from './workspace.service'
import type { WorkspaceDetailData, WorkspaceMemberData } from './workspace.types'

export const getDetails: ParamsRequestHandler<WorkspaceParams> = async (req, res, next): Promise<void> => {
  try {
    const workspace = await workspaceService.getWorkspaceDetails(req.params.workspaceId, req.user!.id)

    sendSuccess<{ workspace: WorkspaceDetailData }>(res, { workspace })
  } catch (error: unknown) {
    next(error)
  }
}

export const listMembers: ParamsRequestHandler<WorkspaceParams> = async (req, res, next): Promise<void> => {
  try {
    const members = await workspaceService.listWorkspaceMembers(req.params.workspaceId, req.user!.id)

    sendSuccess<{ members: WorkspaceMemberData[] }>(res, { members })
  } catch (error: unknown) {
    next(error)
  }
}
