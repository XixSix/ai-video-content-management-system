import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import type { Media, Project, ProjectMedia } from '../../infrastructure/db/generated/prisma/client'
import type { ProjectSummaryRecord, ProjectWithRelations } from './projects.types'

const listProjectsMock = jest.fn()
const findProjectByIdMock = jest.fn()
const findWorkspaceAccessibleProjectByIdMock = jest.fn()
const findWorkspaceMediaByIdMock = jest.fn()
const createBlankProjectMock = jest.fn()
const createProjectFromMediaMock = jest.fn()
const updateProjectMock = jest.fn()
const replaceSourceMediaMock = jest.fn()
const createProjectMediaMock = jest.fn()
const findProjectMediaByIdMock = jest.fn()
const deleteProjectMediaMock = jest.fn()
const isUniqueConstraintErrorMock = jest.fn()
const createProjectSlugMock = jest.fn()
const getClosestProjectAspectRatioMock = jest.fn()

jest.unstable_mockModule('./projects.repository', () => ({
  listProjects: listProjectsMock,
  findProjectById: findProjectByIdMock,
  findWorkspaceAccessibleProjectById: findWorkspaceAccessibleProjectByIdMock,
  findWorkspaceMediaById: findWorkspaceMediaByIdMock,
  createBlankProject: createBlankProjectMock,
  createProjectFromMedia: createProjectFromMediaMock,
  updateProject: updateProjectMock,
  replaceSourceMedia: replaceSourceMediaMock,
  createProjectMedia: createProjectMediaMock,
  findProjectMediaById: findProjectMediaByIdMock,
  deleteProjectMedia: deleteProjectMediaMock,
  isUniqueConstraintError: isUniqueConstraintErrorMock
}))

jest.unstable_mockModule('./projects.util', () => ({
  createProjectSlug: createProjectSlugMock,
  getClosestProjectAspectRatio: getClosestProjectAspectRatioMock
}))

const projectsService = await import('./projects.service')

const userId = '00000000-0000-4000-8000-000000000001'
const otherUserId = '00000000-0000-4000-8000-000000000002'
const workspaceId = '00000000-0000-4000-8000-000000000003'
const projectId = '00000000-0000-4000-8000-000000000004'
const mediaId = '00000000-0000-4000-8000-000000000005'
const projectMediaId = '00000000-0000-4000-8000-000000000006'
const now = new Date('2026-06-20T10:00:00.000Z')

const createMedia = (overrides: Partial<Media> = {}): Media => ({
  id: mediaId,
  userId,
  workspaceId,
  type: 'VIDEO',
  title: 'Source media',
  description: null,
  originalFilename: 'source.mp4',
  s3Bucket: 'vidpilot-media',
  s3Key: 'uploads/source.mp4',
  s3Region: 'us-east-1',
  s3Etag: '"etag"',
  uploadId: null,
  duration: 120,
  fileSizeBytes: BigInt(1024),
  mimeType: 'video/mp4',
  width: 1920,
  height: 1080,
  metadata: null,
  status: 'UPLOADED',
  createdAt: now,
  updatedAt: now,
  ...overrides
})

const createProject = (overrides: Partial<Project> = {}): Project => ({
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
  createdAt: now,
  updatedAt: now,
  ...overrides
})

const createProjectWithRelations = (overrides: Partial<ProjectWithRelations> = {}): ProjectWithRelations => ({
  ...createProject(),
  sourceMedia: null,
  thumbnailMedia: null,
  projectMedia: [],
  ...overrides
})

beforeEach(() => {
  jest.resetAllMocks()
  createProjectSlugMock.mockReturnValue('project-12345678')
  getClosestProjectAspectRatioMock.mockReturnValue('16:9')
  findProjectByIdMock.mockResolvedValue(createProject())
  findWorkspaceAccessibleProjectByIdMock.mockResolvedValue(createProjectWithRelations())
  findWorkspaceMediaByIdMock.mockResolvedValue(createMedia())
  createBlankProjectMock.mockResolvedValue(createProjectWithRelations())
  createProjectFromMediaMock.mockResolvedValue(
    createProjectWithRelations({
      sourceMediaId: mediaId,
      sourceMedia: createMedia(),
      duration: 120
    })
  )
  updateProjectMock.mockResolvedValue(createProjectWithRelations())
  replaceSourceMediaMock.mockResolvedValue(
    createProjectWithRelations({
      sourceMediaId: mediaId,
      sourceMedia: createMedia(),
      duration: 120
    })
  )
  createProjectMediaMock.mockResolvedValue({
    id: projectMediaId,
    projectId,
    mediaId,
    role: 'OVERLAY',
    createdAt: now,
    media: createMedia()
  })
  findProjectMediaByIdMock.mockResolvedValue({
    id: projectMediaId,
    projectId,
    mediaId,
    role: 'OVERLAY',
    createdAt: now
  } satisfies ProjectMedia)
  deleteProjectMediaMock.mockResolvedValue()
  isUniqueConstraintErrorMock.mockReturnValue(false)
})

describe('projects service', () => {
  it('lists projects in the default workspace with pagination and search', async () => {
    const record = createProjectWithRelations() as ProjectSummaryRecord
    listProjectsMock.mockResolvedValue([[record], 1])

    const result = await projectsService.listProjects(workspaceId, {
      page: 2,
      limit: 10,
      search: 'source',
      status: 'ACTIVE',
      sortBy: 'title',
      sortOrder: 'asc'
    })

    expect(listProjectsMock).toHaveBeenCalledWith(
      {
        workspaceId,
        search: 'source',
        status: 'ACTIVE'
      },
      10,
      10,
      'title',
      'asc'
    )
    expect(result).toMatchObject({
      total: 1,
      page: 2,
      limit: 10,
      totalPages: 1
    })
  })

  it('creates a blank project with a stable generated slug', async () => {
    await projectsService.createBlankProject(userId, workspaceId, {
      title: 'My Project'
    })

    expect(createProjectSlugMock).toHaveBeenCalledWith('My Project')
    expect(createBlankProjectMock).toHaveBeenCalledWith({
      userId,
      workspaceId,
      title: 'My Project',
      slug: 'project-12345678',
      status: 'DRAFT'
    })
  })

  it('creates a project from uploaded media and derives its aspect ratio', async () => {
    await projectsService.createProjectFromMedia(userId, workspaceId, {
      mediaId,
      title: 'Project from media'
    })

    expect(createProjectFromMediaMock).toHaveBeenCalledWith(
      {
        userId,
        workspaceId,
        sourceMediaId: mediaId,
        title: 'Project from media',
        slug: 'project-12345678',
        aspectRatio: '16:9',
        duration: 120,
        status: 'DRAFT'
      },
      mediaId
    )
    expect(getClosestProjectAspectRatioMock).toHaveBeenCalledWith(1920, 1080)
  })

  it('rejects source media outside the workspace, not uploaded, or unsupported', async () => {
    findWorkspaceMediaByIdMock.mockResolvedValueOnce(null)
    await expect(
      projectsService.createProjectFromMedia(userId, workspaceId, {
        mediaId,
        title: 'Project'
      })
    ).rejects.toMatchObject({ code: 'PROJECT_MEDIA_NOT_FOUND' })

    findWorkspaceMediaByIdMock.mockResolvedValueOnce(createMedia({ status: 'UPLOADING' }))
    await expect(
      projectsService.createProjectFromMedia(userId, workspaceId, {
        mediaId,
        title: 'Project'
      })
    ).rejects.toMatchObject({ code: 'PROJECT_MEDIA_INVALID' })

    findWorkspaceMediaByIdMock.mockResolvedValueOnce(createMedia({ type: 'IMAGE' }))
    await expect(
      projectsService.createProjectFromMedia(userId, workspaceId, {
        mediaId,
        title: 'Project'
      })
    ).rejects.toMatchObject({ code: 'PROJECT_MEDIA_INVALID' })
  })

  it('rejects video source media without dimensions', async () => {
    findWorkspaceMediaByIdMock.mockResolvedValueOnce(
      createMedia({
        width: null,
        height: null
      })
    )

    await expect(
      projectsService.createProjectFromMedia(userId, workspaceId, {
        mediaId,
        title: 'Project'
      })
    ).rejects.toMatchObject({ code: 'PROJECT_MEDIA_INVALID' })
  })

  it('allows workspace reads but restricts mutations to the project creator', async () => {
    findWorkspaceAccessibleProjectByIdMock.mockResolvedValue(
      createProjectWithRelations({
        userId: otherUserId
      })
    )
    await expect(projectsService.getProject(workspaceId, projectId)).resolves.toMatchObject({
      id: projectId
    })

    findProjectByIdMock.mockResolvedValue(createProject({ userId: otherUserId }))
    await expect(
      projectsService.updateProject(userId, workspaceId, projectId, {
        title: 'Renamed'
      })
    ).rejects.toMatchObject({
      code: 'FORBIDDEN'
    })
  })

  it.each([
    ['VIDEO', 'OVERLAY'],
    ['IMAGE', 'OVERLAY'],
    ['AUDIO', 'AUDIO_BED']
  ] as const)('maps %s media to %s', async (type, expectedRole) => {
    findWorkspaceMediaByIdMock.mockResolvedValueOnce(createMedia({ type }))
    createProjectMediaMock.mockResolvedValueOnce({
      id: projectMediaId,
      projectId,
      mediaId,
      role: expectedRole,
      createdAt: now,
      media: createMedia({ type })
    })

    const result = await projectsService.addProjectMedia(userId, workspaceId, projectId, {
      mediaId
    })

    expect(createProjectMediaMock).toHaveBeenCalledWith(projectId, mediaId, expectedRole)
    expect(result.role).toBe(expectedRole)
  })

  it('rejects unsupported project media types', async () => {
    findWorkspaceMediaByIdMock.mockResolvedValueOnce(createMedia({ type: 'SUBTITLE' }))

    await expect(
      projectsService.addProjectMedia(userId, workspaceId, projectId, {
        mediaId
      })
    ).rejects.toMatchObject({ code: 'PROJECT_MEDIA_INVALID' })
  })

  it('replaces source media through the transactional repository boundary', async () => {
    const result = await projectsService.setSourceMedia(userId, workspaceId, projectId, {
      mediaId
    })

    expect(replaceSourceMediaMock).toHaveBeenCalledWith(projectId, expect.objectContaining({ id: mediaId }))
    expect(result).toMatchObject({
      sourceMediaId: mediaId,
      duration: 120
    })
  })

  it('maps duplicate project media to a conflict', async () => {
    const uniqueError = new Error('P2002')
    createProjectMediaMock.mockRejectedValue(uniqueError)
    isUniqueConstraintErrorMock.mockReturnValue(true)

    await expect(
      projectsService.addProjectMedia(userId, workspaceId, projectId, {
        mediaId
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      code: 'PROJECT_MEDIA_CONFLICT'
    })
  })

  it('soft deletes idempotently and hides deleted projects from reads', async () => {
    await projectsService.deleteProject(userId, workspaceId, projectId)
    expect(updateProjectMock).toHaveBeenCalledWith(projectId, {
      status: 'DELETED'
    })

    findProjectByIdMock.mockResolvedValue(createProject({ status: 'DELETED' }))
    await projectsService.deleteProject(userId, workspaceId, projectId)
    expect(updateProjectMock).toHaveBeenCalledTimes(1)

    findWorkspaceAccessibleProjectByIdMock.mockResolvedValue(createProjectWithRelations({ status: 'DELETED' }))
    await expect(projectsService.getProject(workspaceId, projectId)).rejects.toMatchObject({
      code: 'PROJECT_NOT_FOUND'
    })
  })

  it('removes only non-source media belonging to the project', async () => {
    await projectsService.removeProjectMedia(userId, workspaceId, projectId, projectMediaId)
    expect(deleteProjectMediaMock).toHaveBeenCalledWith(projectMediaId)

    findProjectMediaByIdMock.mockResolvedValueOnce({
      id: projectMediaId,
      projectId,
      mediaId,
      role: 'SOURCE',
      createdAt: now
    })
    await expect(
      projectsService.removeProjectMedia(userId, workspaceId, projectId, projectMediaId)
    ).rejects.toMatchObject({
      code: 'PROJECT_MEDIA_INVALID'
    })
  })
})
