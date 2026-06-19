import { beforeEach, describe, expect, it, jest } from '@jest/globals'

const findUniqueMock = jest.fn()
const createUserMock = jest.fn()
const createWorkspaceMock = jest.fn()
const createSessionMock = jest.fn()
const transactionMock = jest.fn(async (callback: (transaction: unknown) => unknown) =>
  callback({
    user: {
      findUnique: findUniqueMock,
      create: createUserMock
    },
    workspace: {
      create: createWorkspaceMock
    },
    authSession: {
      create: createSessionMock
    }
  })
)

jest.unstable_mockModule('../../infrastructure/db/prisma', () => ({
  prisma: {
    $transaction: transactionMock
  }
}))

const authRepository = await import('./auth.repository')

const user = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'user@example.com',
  passwordHash: 'hashed-password',
  fullName: null,
  avatarUrl: null,
  role: 'USER',
  status: 'ACTIVE',
  createdAt: new Date(),
  updatedAt: new Date()
}

const input = {
  id: user.id,
  email: user.email,
  passwordHash: user.passwordHash,
  session: {
    jti: '123e4567-e89b-12d3-a456-426614174001',
    expiresAt: new Date(Date.now() + 60_000),
    lastUsedAt: new Date()
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  findUniqueMock.mockResolvedValue(null)
  createUserMock.mockResolvedValue(user)
  createWorkspaceMock.mockResolvedValue({
    id: '123e4567-e89b-12d3-a456-426614174002'
  })
  createSessionMock.mockResolvedValue({
    id: '123e4567-e89b-12d3-a456-426614174003'
  })
})

describe('auth repository registration transaction', () => {
  it('creates the user, default workspace owner, and session in one transaction', async () => {
    await expect(authRepository.registerUserWithWorkspaceAndSession(input)).resolves.toEqual(user)

    expect(transactionMock).toHaveBeenCalledTimes(1)
    expect(createWorkspaceMock).toHaveBeenCalledWith({
      data: {
        ownerId: user.id,
        name: 'Workspace',
        slug: `workspace-${user.id.replaceAll('-', '')}`,
        members: {
          create: {
            userId: user.id,
            role: 'OWNER'
          }
        }
      }
    })
    expect(createSessionMock).toHaveBeenCalledWith({
      data: {
        userId: user.id,
        ...input.session
      }
    })
  })

  it('does not create related records when the email already exists', async () => {
    findUniqueMock.mockResolvedValue(user)

    await expect(authRepository.registerUserWithWorkspaceAndSession(input)).resolves.toBeNull()
    expect(createUserMock).not.toHaveBeenCalled()
    expect(createWorkspaceMock).not.toHaveBeenCalled()
    expect(createSessionMock).not.toHaveBeenCalled()
  })

  it('propagates a transaction failure before creating the session', async () => {
    createWorkspaceMock.mockRejectedValue(new Error('workspace create failed'))

    await expect(authRepository.registerUserWithWorkspaceAndSession(input)).rejects.toThrow('workspace create failed')
    expect(createSessionMock).not.toHaveBeenCalled()
  })
})
