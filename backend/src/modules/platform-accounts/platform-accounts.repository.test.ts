import { beforeEach, describe, expect, it, jest } from '@jest/globals'

const oauthStateUpdateManyMock = jest.fn()
const accountFindManyMock = jest.fn()
const accountUpdateManyMock = jest.fn()

jest.unstable_mockModule('../../infrastructure/db/prisma', () => ({
  prisma: {
    platformOAuthState: {
      updateMany: oauthStateUpdateManyMock
    },
    platformAccount: {
      findMany: accountFindManyMock,
      updateMany: accountUpdateManyMock
    }
  }
}))

const repository = await import('./platform-accounts.repository')

const workspaceId = '00000000-0000-4000-8000-000000000001'
const stateId = '00000000-0000-4000-8000-000000000002'
const now = new Date('2026-06-23T10:00:00.000Z')

beforeEach(() => {
  jest.resetAllMocks()
})

describe('platform accounts repository', () => {
  it('claims an OAuth state only while it is unconsumed and unexpired', async () => {
    oauthStateUpdateManyMock.mockResolvedValue({ count: 1 })

    await expect(repository.claimPlatformOAuthState(stateId, now)).resolves.toBe(true)

    expect(oauthStateUpdateManyMock).toHaveBeenCalledWith({
      where: {
        id: stateId,
        consumedAt: null,
        expiresAt: { gt: now }
      },
      data: { consumedAt: now }
    })
  })

  it('returns false when another callback already claimed the state', async () => {
    oauthStateUpdateManyMock.mockResolvedValue({ count: 0 })

    await expect(repository.claimPlatformOAuthState(stateId, now)).resolves.toBe(false)
  })

  it('lists only non-revoked accounts in one workspace', async () => {
    accountFindManyMock.mockResolvedValue([])

    await repository.findPlatformAccountsByWorkspaceId(workspaceId)

    expect(accountFindManyMock).toHaveBeenCalledWith({
      where: {
        workspaceId,
        status: { not: 'REVOKED' }
      },
      orderBy: { createdAt: 'asc' }
    })
  })

  it('marks elapsed connected accounts expired in one workspace', async () => {
    accountUpdateManyMock.mockResolvedValue({ count: 2 })

    await expect(repository.expireElapsedPlatformAccounts(workspaceId, now)).resolves.toBe(2)

    expect(accountUpdateManyMock).toHaveBeenCalledWith({
      where: {
        workspaceId,
        status: 'CONNECTED',
        expiresAt: { lte: now }
      },
      data: { status: 'EXPIRED' }
    })
  })
})
