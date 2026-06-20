import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import request from 'supertest'
import type { AuthenticatedUser } from '../auth/auth.types'
import { AuthError } from '../auth/auth.error'
import type { ProjectDetailData, ProjectMediaData } from './projects.types'

const getAuthenticatedUserMock = jest.fn<(accessToken: string) => Promise<AuthenticatedUser>>()
const getDefaultWorkspaceMembershipMock = jest.fn()
const listProjectsMock = jest.fn()
const getProjectMock = jest.fn()
const createBlankProjectMock = jest.fn()
const createProjectFromMediaMock = jest.fn()
const updateProjectMock = jest.fn()
const deleteProjectMock = jest.fn()
const setSourceMediaMock = jest.fn()
const addProjectMediaMock = jest.fn()
const removeProjectMediaMock = jest.fn()

jest.unstable_mockModule('../auth/auth.service', () => ({
  getAuthenticatedUser: getAuthenticatedUserMock,
  getDefaultWorkspaceMembership: getDefaultWorkspaceMembershipMock
}))

jest.unstable_mockModule('./projects.service', () => ({
  listProjects: listProjectsMock,
  getProject: getProjectMock,
  createBlankProject: createBlankProjectMock,
  createProjectFromMedia: createProjectFromMediaMock,
  updateProject: updateProjectMock,
  deleteProject: deleteProjectMock,
  setSourceMedia: setSourceMediaMock,
  addProjectMedia: addProjectMediaMock,
  removeProjectMedia: removeProjectMediaMock
}))

const { app } = await import('../../app')

const userId = '00000000-0000-4000-8000-000000000001'
const workspaceId = '00000000-0000-4000-8000-000000000002'
const projectId = '00000000-0000-4000-8000-000000000003'
const mediaId = '00000000-0000-4000-8000-000000000004'
const projectMediaId = '00000000-0000-4000-8000-000000000005'
const now = new Date('2026-06-20T10:00:00.000Z')

const authenticatedUser: AuthenticatedUser = {
  id: userId,
  email: 'user@example.com',
  role: 'USER',
  status: 'ACTIVE'
}

const project: ProjectDetailData = {
  id: projectId,
  userId,
  workspaceId,
  sourceMediaId: null,
  thumbnailMediaId: null,
  title: 'Project',
  slug: 'project-12345678',
  status: 'DRAFT',
  aspectRatio: '9:16',
  duration: null,
  sourceMedia: null,
  thumbnailMedia: null,
  projectMedia: [],
  createdAt: now,
  updatedAt: now
}

const projectMedia: ProjectMediaData = {
  id: projectMediaId,
  role: 'OVERLAY',
  createdAt: now,
  media: {
    id: mediaId,
    type: 'VIDEO',
    title: 'Media',
    originalFilename: 'media.mp4',
    duration: 30,
    mimeType: 'video/mp4',
    width: 1920,
    height: 1080,
    status: 'UPLOADED'
  }
}

beforeEach(() => {
  jest.resetAllMocks()
  getAuthenticatedUserMock.mockResolvedValue(authenticatedUser)
  getDefaultWorkspaceMembershipMock.mockResolvedValue({
    id: workspaceId,
    role: 'OWNER'
  })
  listProjectsMock.mockResolvedValue({
    items: [project],
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1
  })
  getProjectMock.mockResolvedValue(project)
  createBlankProjectMock.mockResolvedValue(project)
  createProjectFromMediaMock.mockResolvedValue(project)
  updateProjectMock.mockResolvedValue(project)
  deleteProjectMock.mockResolvedValue()
  setSourceMediaMock.mockResolvedValue(project)
  addProjectMediaMock.mockResolvedValue(projectMedia)
  removeProjectMediaMock.mockResolvedValue()
})

describe('project routes', () => {
  it.each([
    ['GET', '/api/v1/projects'],
    ['POST', '/api/v1/projects/blank'],
    ['POST', '/api/v1/projects/from-media'],
    ['GET', `/api/v1/projects/${projectId}`],
    ['PATCH', `/api/v1/projects/${projectId}`],
    ['DELETE', `/api/v1/projects/${projectId}`],
    ['PUT', `/api/v1/projects/${projectId}/source-media`],
    ['POST', `/api/v1/projects/${projectId}/media`],
    ['DELETE', `/api/v1/projects/${projectId}/media/${projectMediaId}`]
  ])('%s %s requires an access token', async (method, path) => {
    const requestMethod = method.toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete'
    const response = await request(app)[requestMethod](path).send({})

    expect(response.status).toBe(401)
  })

  it('requires workspace membership', async () => {
    getDefaultWorkspaceMembershipMock.mockRejectedValue(AuthError.forbidden('No workspace'))

    const response = await request(app).get('/api/v1/projects').set('Authorization', 'Bearer access-token')

    expect(response.status).toBe(403)
    expect(listProjectsMock).not.toHaveBeenCalled()
  })

  it('creates a blank project from its title only', async () => {
    const response = await request(app)
      .post('/api/v1/projects/blank')
      .set('Authorization', 'Bearer access-token')
      .send({ title: 'Project' })

    expect(response.status).toBe(201)
    expect(createBlankProjectMock).toHaveBeenCalledWith(userId, workspaceId, {
      title: 'Project'
    })
    expect(response.body.data.project.id).toBe(projectId)
  })

  it('rejects aspect ratio when creating a blank project', async () => {
    const response = await request(app)
      .post('/api/v1/projects/blank')
      .set('Authorization', 'Bearer access-token')
      .send({ title: 'Project', aspectRatio: '16:9' })

    expect(response.status).toBe(400)
    expect(createBlankProjectMock).not.toHaveBeenCalled()
  })

  it('creates a project from media', async () => {
    const response = await request(app)
      .post('/api/v1/projects/from-media')
      .set('Authorization', 'Bearer access-token')
      .send({ mediaId, title: 'Project from media' })

    expect(response.status).toBe(201)
    expect(createProjectFromMediaMock).toHaveBeenCalledWith(userId, workspaceId, {
      mediaId,
      title: 'Project from media'
    })
  })

  it('lists projects with validated pagination, filters, and sorting', async () => {
    const response = await request(app)
      .get('/api/v1/projects')
      .query({
        page: '2',
        limit: '20',
        search: 'source',
        status: 'ACTIVE',
        sortBy: 'title',
        sortOrder: 'asc'
      })
      .set('Authorization', 'Bearer access-token')

    expect(response.status).toBe(200)
    expect(listProjectsMock).toHaveBeenCalledWith(workspaceId, {
      page: 2,
      limit: 20,
      search: 'source',
      status: 'ACTIVE',
      sortBy: 'title',
      sortOrder: 'asc'
    })
    expect(response.body.data.meta).toEqual({
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1
    })
  })

  it('updates only project title and status', async () => {
    const response = await request(app)
      .patch(`/api/v1/projects/${projectId}`)
      .set('Authorization', 'Bearer access-token')
      .send({
        title: 'Renamed',
        status: 'ARCHIVED'
      })

    expect(response.status).toBe(200)
    expect(updateProjectMock).toHaveBeenCalledWith(userId, workspaceId, projectId, {
      title: 'Renamed',
      status: 'ARCHIVED'
    })

    const invalidResponse = await request(app)
      .patch(`/api/v1/projects/${projectId}`)
      .set('Authorization', 'Bearer access-token')
      .send({ status: 'DELETED' })

    expect(invalidResponse.status).toBe(400)
  })

  it.each([
    ['aspectRatio', { aspectRatio: '16:9' }],
    ['thumbnailMediaId', { thumbnailMediaId: mediaId }]
  ])('rejects unsupported project update field %s', async (_field, body) => {
    const response = await request(app)
      .patch(`/api/v1/projects/${projectId}`)
      .set('Authorization', 'Bearer access-token')
      .send(body)

    expect(response.status).toBe(400)
    expect(updateProjectMock).not.toHaveBeenCalled()
  })

  it('validates project IDs and rejects client-selected project-media roles', async () => {
    const invalidIdResponse = await request(app)
      .get('/api/v1/projects/not-a-uuid')
      .set('Authorization', 'Bearer access-token')
    const invalidRoleResponse = await request(app)
      .post(`/api/v1/projects/${projectId}/media`)
      .set('Authorization', 'Bearer access-token')
      .send({
        mediaId,
        role: 'OVERLAY'
      })

    expect(invalidIdResponse.status).toBe(400)
    expect(invalidRoleResponse.status).toBe(400)
    expect(addProjectMediaMock).not.toHaveBeenCalled()
  })

  it('sets source media, adds media, removes media, and soft deletes', async () => {
    const sourceResponse = await request(app)
      .put(`/api/v1/projects/${projectId}/source-media`)
      .set('Authorization', 'Bearer access-token')
      .send({ mediaId })
    const addResponse = await request(app)
      .post(`/api/v1/projects/${projectId}/media`)
      .set('Authorization', 'Bearer access-token')
      .send({ mediaId })
    const removeResponse = await request(app)
      .delete(`/api/v1/projects/${projectId}/media/${projectMediaId}`)
      .set('Authorization', 'Bearer access-token')
    const deleteResponse = await request(app)
      .delete(`/api/v1/projects/${projectId}`)
      .set('Authorization', 'Bearer access-token')

    expect(sourceResponse.status).toBe(200)
    expect(addResponse.status).toBe(201)
    expect(removeResponse.status).toBe(200)
    expect(deleteResponse.status).toBe(200)
    expect(setSourceMediaMock).toHaveBeenCalledWith(userId, workspaceId, projectId, { mediaId })
    expect(addProjectMediaMock).toHaveBeenCalledWith(userId, workspaceId, projectId, {
      mediaId
    })
    expect(removeProjectMediaMock).toHaveBeenCalledWith(userId, workspaceId, projectId, projectMediaId)
    expect(deleteProjectMock).toHaveBeenCalledWith(userId, workspaceId, projectId)
  })
})
