import { describe, expect, it } from '@jest/globals'
import {
  addProjectMediaSchema,
  createBlankProjectSchema,
  createProjectFromMediaSchema,
  listProjectsQuerySchema,
  projectMediaParamsSchema,
  projectParamsSchema,
  updateProjectSchema
} from './projects.schema'

describe('project schemas', () => {
  it('requires workspace and project route parameters', () => {
    const workspaceId = '00000000-0000-4000-8000-000000000001'
    const projectId = '00000000-0000-4000-8000-000000000002'
    const projectMediaId = '00000000-0000-4000-8000-000000000003'

    expect(projectParamsSchema.parse({ workspaceId, projectId })).toEqual({ workspaceId, projectId })
    expect(projectMediaParamsSchema.parse({ workspaceId, projectId, projectMediaId })).toEqual({
      workspaceId,
      projectId,
      projectMediaId
    })
    expect(projectParamsSchema.safeParse({ projectId }).success).toBe(false)
  })

  it('accepts only a title for blank projects and defaults list queries', () => {
    expect(
      createBlankProjectSchema.parse({
        title: '  Project  '
      })
    ).toEqual({
      title: 'Project'
    })
    expect(listProjectsQuerySchema.parse({})).toEqual({
      page: 1,
      limit: 10,
      sortBy: 'updatedAt',
      sortOrder: 'desc'
    })
  })

  it('rejects DELETED updates, SOURCE attachments, and unknown fields', () => {
    expect(
      updateProjectSchema.safeParse({
        status: 'DELETED'
      }).success
    ).toBe(false)
    expect(
      updateProjectSchema.safeParse({
        aspectRatio: '16:9'
      }).success
    ).toBe(false)
    expect(
      updateProjectSchema.safeParse({
        thumbnailMediaId: '00000000-0000-4000-8000-000000000001'
      }).success
    ).toBe(false)
    expect(
      addProjectMediaSchema.safeParse({
        mediaId: '00000000-0000-4000-8000-000000000001',
        role: 'OVERLAY'
      }).success
    ).toBe(false)
    expect(
      createBlankProjectSchema.safeParse({
        title: 'Project',
        unexpected: true
      }).success
    ).toBe(false)
    expect(
      createBlankProjectSchema.safeParse({
        title: 'Project',
        aspectRatio: '16:9'
      }).success
    ).toBe(false)
    expect(
      createBlankProjectSchema.safeParse({
        name: 'Project'
      }).success
    ).toBe(false)
    expect(
      createProjectFromMediaSchema.safeParse({
        mediaId: '00000000-0000-4000-8000-000000000001',
        title: 'Project',
        aspectRatio: '16:9'
      }).success
    ).toBe(false)
    expect(
      createProjectFromMediaSchema.safeParse({
        mediaId: '00000000-0000-4000-8000-000000000001'
      }).success
    ).toBe(false)
  })
})
