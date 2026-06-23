import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import request from 'supertest'
import type { AuthenticatedUser } from '../auth/auth.types'
import { WorkspaceError } from '../workspace/workspace.error'
import { EditorSnapshotsError } from './editor-snapshots.error'

const getAuthenticatedUserMock = jest.fn<(accessToken: string) => Promise<AuthenticatedUser>>()
const getWorkspaceMembershipContextMock = jest.fn()
const getEditorSnapshotMock = jest.fn()
const saveEditorSnapshotMock = jest.fn()

jest.unstable_mockModule('../auth/auth.service', () => ({
  getAuthenticatedUser: getAuthenticatedUserMock
}))

jest.unstable_mockModule('../workspace/workspace.service', () => ({
  getWorkspaceMembershipContext: getWorkspaceMembershipContextMock
}))

jest.unstable_mockModule('./editor-snapshots.service', () => ({
  getEditorSnapshot: getEditorSnapshotMock,
  saveEditorSnapshot: saveEditorSnapshotMock
}))

const { app } = await import('../../app')

const userId = '00000000-0000-4000-8000-000000000001'
const workspaceId = '00000000-0000-4000-8000-000000000002'
const projectId = '00000000-0000-4000-8000-000000000003'
const editorSnapshotPath = `/api/v1/workspaces/${workspaceId}/projects/${projectId}/editor-snapshot`
const now = new Date('2026-06-20T10:00:00.000Z')
const document = {
  schemaVersion: 1,
  settings: {
    aspectRatio: '9:16'
  },
  layers: [],
  timelineTracks: []
}
const editorSnapshot = {
  projectId,
  version: 1,
  document,
  savedByUserId: userId,
  savedAt: now
}
const authenticatedUser: AuthenticatedUser = {
  id: userId,
  email: 'user@example.com',
  role: 'USER',
  status: 'ACTIVE'
}

beforeEach(() => {
  jest.resetAllMocks()
  getAuthenticatedUserMock.mockResolvedValue(authenticatedUser)
  getWorkspaceMembershipContextMock.mockResolvedValue({
    id: workspaceId,
    role: 'OWNER'
  })
  getEditorSnapshotMock.mockResolvedValue(null)
  saveEditorSnapshotMock.mockResolvedValue(editorSnapshot)
})

describe('editor snapshot routes', () => {
  it.each(['get', 'put'] as const)('%s requires an access token', async (method) => {
    const response = await request(app)[method](editorSnapshotPath).send({})

    expect(response.status).toBe(401)
  })

  it('validates the selected workspace ID', async () => {
    const response = await request(app)
      .get(`/api/v1/workspaces/not-a-uuid/projects/${projectId}/editor-snapshot`)
      .set('Authorization', 'Bearer access-token')

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('VALIDATION_ERROR')
    expect(getWorkspaceMembershipContextMock).not.toHaveBeenCalled()
    expect(getEditorSnapshotMock).not.toHaveBeenCalled()
  })

  it('requires membership in the selected workspace', async () => {
    getWorkspaceMembershipContextMock.mockRejectedValue(WorkspaceError.forbidden())
    const response = await request(app).get(editorSnapshotPath).set('Authorization', 'Bearer access-token')

    expect(response.status).toBe(403)
    expect(getEditorSnapshotMock).not.toHaveBeenCalled()
  })

  it('returns null when a project has no snapshot', async () => {
    const response = await request(app).get(editorSnapshotPath).set('Authorization', 'Bearer access-token')

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual({
      editorSnapshot: null
    })
    expect(getEditorSnapshotMock).toHaveBeenCalledWith(workspaceId, projectId)
  })

  it('validates and saves a full composition document', async () => {
    const response = await request(app).put(editorSnapshotPath).set('Authorization', 'Bearer access-token').send({
      baseVersion: 0,
      document
    })

    expect(response.status).toBe(200)
    expect(saveEditorSnapshotMock).toHaveBeenCalledWith(userId, workspaceId, projectId, {
      baseVersion: 0,
      document
    })
    expect(response.body.data.editorSnapshot).toMatchObject({
      projectId,
      version: 1
    })
  })

  it('rejects UI-only state and invalid project IDs before the service', async () => {
    const invalidBodyResponse = await request(app)
      .put(editorSnapshotPath)
      .set('Authorization', 'Bearer access-token')
      .send({
        baseVersion: 0,
        document: {
          ...document,
          currentTime: 10
        }
      })
    const invalidIdResponse = await request(app)
      .get(`/api/v1/workspaces/${workspaceId}/projects/not-a-uuid/editor-snapshot`)
      .set('Authorization', 'Bearer access-token')

    expect(invalidBodyResponse.status).toBe(400)
    expect(invalidIdResponse.status).toBe(400)
    expect(saveEditorSnapshotMock).not.toHaveBeenCalled()
  })

  it('returns version conflict details from the service', async () => {
    saveEditorSnapshotMock.mockRejectedValue(EditorSnapshotsError.versionConflict(4, 3))

    const response = await request(app).put(editorSnapshotPath).set('Authorization', 'Bearer access-token').send({
      baseVersion: 3,
      document
    })

    expect(response.status).toBe(409)
    expect(response.body.error).toMatchObject({
      code: 'EDITOR_SNAPSHOT_VERSION_CONFLICT',
      details: {
        currentVersion: 4,
        baseVersion: 3
      }
    })
  })
})
