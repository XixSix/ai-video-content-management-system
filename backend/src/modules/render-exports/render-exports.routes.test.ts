import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import request from 'supertest'
import type { AuthenticatedUser } from '../auth/auth.types'
import { WorkspaceError } from '../workspace/workspace.error'
import type { JobResponseData } from '../jobs/jobs.types'

const getAuthenticatedUserMock = jest.fn<(accessToken: string) => Promise<AuthenticatedUser>>()
const getWorkspaceMembershipContextMock = jest.fn()
const createRenderExportMock = jest.fn()

jest.unstable_mockModule('../auth/auth.service', () => ({
  getAuthenticatedUser: getAuthenticatedUserMock
}))

jest.unstable_mockModule('../workspace/workspace.service', () => ({
  getWorkspaceMembershipContext: getWorkspaceMembershipContextMock
}))

jest.unstable_mockModule('./render-exports.service', () => ({
  createRenderExport: createRenderExportMock
}))

const { app } = await import('../../app')

const userId = '00000000-0000-4000-8000-000000000001'
const workspaceId = '00000000-0000-4000-8000-000000000002'
const projectId = '00000000-0000-4000-8000-000000000003'
const mediaId = '00000000-0000-4000-8000-000000000004'
const exportPath = `/api/v1/workspaces/${workspaceId}/projects/${projectId}/export-render`
const now = new Date('2026-06-24T00:00:00.000Z')

const authenticatedUser: AuthenticatedUser = {
  id: userId,
  email: 'user@example.com',
  role: 'USER',
  status: 'ACTIVE'
}

const job: JobResponseData = {
  id: '00000000-0000-4000-8000-000000000005',
  mediaId,
  jobType: 'EXPORT_RENDER',
  status: 'PENDING',
  progress: 0,
  errorMessage: null,
  output: null,
  attemptCount: 0,
  createdAt: now,
  updatedAt: now,
  startedAt: null,
  completedAt: null
}

describe('render export routes', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    getAuthenticatedUserMock.mockResolvedValue(authenticatedUser)
    getWorkspaceMembershipContextMock.mockResolvedValue({
      id: workspaceId,
      role: 'OWNER'
    })
    createRenderExportMock.mockResolvedValue({ job, wasCreated: true })
  })

  it('requires an access token', async () => {
    const response = await request(app).post(exportPath).send({})

    expect(response.status).toBe(401)
    expect(createRenderExportMock).not.toHaveBeenCalled()
  })

  it('requires membership in the selected workspace', async () => {
    getWorkspaceMembershipContextMock.mockRejectedValue(WorkspaceError.forbidden())

    const response = await request(app).post(exportPath).set('Authorization', 'Bearer access-token')

    expect(response.status).toBe(403)
    expect(getWorkspaceMembershipContextMock).toHaveBeenCalledWith(workspaceId, userId)
    expect(createRenderExportMock).not.toHaveBeenCalled()
  })

  it('creates a render export job for a project', async () => {
    const response = await request(app).post(exportPath).set('Authorization', 'Bearer access-token')

    expect(response.status).toBe(201)
    expect(createRenderExportMock).toHaveBeenCalledWith(userId, workspaceId, projectId)
    expect(response.body.data.job.id).toBe(job.id)
  })

  it('returns 200 for an existing active render export job', async () => {
    createRenderExportMock.mockResolvedValue({ job, wasCreated: false })

    const response = await request(app).post(exportPath).set('Authorization', 'Bearer access-token')

    expect(response.status).toBe(200)
    expect(response.body.data.job.jobType).toBe('EXPORT_RENDER')
  })
})
