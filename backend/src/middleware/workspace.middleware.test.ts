import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import type { NextFunction, Request, Response } from 'express'

const getDefaultWorkspaceMembershipMock = jest.fn()

jest.unstable_mockModule('../modules/auth/auth.service', () => ({
  getDefaultWorkspaceMembership: getDefaultWorkspaceMembershipMock
}))

const { requireWorkspaceMembership } = await import('./workspace.middleware')

const next = jest.fn() as jest.MockedFunction<NextFunction>
const response = {} as Response

beforeEach(() => {
  jest.resetAllMocks()
  getDefaultWorkspaceMembershipMock.mockResolvedValue({
    id: '00000000-0000-4000-8000-000000000002',
    role: 'MEMBER'
  })
})

describe('requireWorkspaceMembership', () => {
  it('attaches workspace context for an authenticated member', async () => {
    const request = {
      user: {
        id: '00000000-0000-4000-8000-000000000001'
      }
    } as Request

    await requireWorkspaceMembership(request, response, next)

    expect(getDefaultWorkspaceMembershipMock).toHaveBeenCalledWith(request.user!.id)
    expect(request.workspace).toEqual({
      id: '00000000-0000-4000-8000-000000000002',
      role: 'MEMBER'
    })
    expect(next).toHaveBeenCalledWith()
  })

  it('rejects requests when authenticate has not run', async () => {
    await requireWorkspaceMembership({} as Request, response, next)

    expect(getDefaultWorkspaceMembershipMock).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        code: 'UNAUTHORIZED'
      })
    )
  })
})
