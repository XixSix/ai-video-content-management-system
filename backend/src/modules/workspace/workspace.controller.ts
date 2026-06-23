import type { AppRequestHandler, ParamsRequestHandler } from '../../types/express'
import { sendSuccess } from '../../utils/response'
import type { WorkspaceParams } from './workspace.schema'
import * as workspaceService from './workspace.service'
import type { WorkspaceDetailData, WorkspaceListData, WorkspaceMemberData } from './workspace.types'

export const list: AppRequestHandler = async (req, res, next): Promise<void> => {
  try {
    const result = await workspaceService.listUserWorkspaces(req.user!.id)

    sendSuccess<WorkspaceListData>(res, result)
  } catch (error: unknown) {
    next(error)
  }
}

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

export const setPreferred: ParamsRequestHandler<WorkspaceParams> = async (req, res, next): Promise<void> => {
  try {
    const preferredWorkspaceId = await workspaceService.setPreferredWorkspace(req.params.workspaceId, req.user!.id)

    sendSuccess<{ preferredWorkspaceId: string }>(res, { preferredWorkspaceId })
  } catch (error: unknown) {
    next(error)
  }
}
