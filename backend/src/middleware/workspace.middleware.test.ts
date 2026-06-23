import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import type { NextFunction, Request, Response } from 'express'

const getWorkspaceMembershipContextMock = jest.fn()

jest.unstable_mockModule('../modules/workspace/workspace.service', () => ({
  getWorkspaceMembershipContext: getWorkspaceMembershipContextMock
}))

const { requireWorkspaceMembership, requireWorkspaceOwner } = await import('./workspace.middleware')

const next = jest.fn() as jest.MockedFunction<NextFunction>
const response = {} as Response
const userId = '00000000-0000-4000-8000-000000000001'
const workspaceId = '00000000-0000-4000-8000-000000000002'

beforeEach(() => {
  jest.resetAllMocks()
  getWorkspaceMembershipContextMock.mockResolvedValue({
    id: workspaceId,
    role: 'MEMBER'
  })
})

describe('requireWorkspaceMembership', () => {
  it('attaches workspace context for an authenticated member', async () => {
    const request = {
      user: {
        id: userId
      },
      params: { workspaceId }
    } as Request

    await requireWorkspaceMembership(request, response, next)

    expect(getWorkspaceMembershipContextMock).toHaveBeenCalledWith(workspaceId, userId)
    expect(request.workspace).toEqual({
      id: workspaceId,
      role: 'MEMBER'
    })
    expect(next).toHaveBeenCalledWith()
  })

  it('rejects requests when authenticate has not run', async () => {
    await requireWorkspaceMembership({} as Request, response, next)

    expect(getWorkspaceMembershipContextMock).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        code: 'UNAUTHORIZED'
      })
    )
  })
})

describe('requireWorkspaceOwner', () => {
  it('continues for workspace owners', () => {
    const request = {
      workspace: {
        id: workspaceId,
        role: 'OWNER'
      }
    } as Request

    requireWorkspaceOwner(request, response, next)

    expect(next).toHaveBeenCalledWith()
  })

  it.each([
    ['a regular member', { id: workspaceId, role: 'MEMBER' }],
    ['a missing workspace context', undefined]
  ])('rejects %s', (_label, workspace) => {
    const request = { workspace } as Request

    requireWorkspaceOwner(request, response, next)

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        code: 'WORKSPACE_OWNER_REQUIRED'
      })
    )
  })
})
