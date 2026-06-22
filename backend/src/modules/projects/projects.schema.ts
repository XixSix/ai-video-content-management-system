import { z } from 'zod'
import { ProjectStatus } from '../../infrastructure/db/generated/prisma/client'

export const projectAspectRatioSchema = z.enum(['9:16', '1:1', '4:5', '16:9'])

const workspaceParamsShape = {
  workspaceId: z.uuid()
}

export const projectParamsSchema = z.strictObject({
  ...workspaceParamsShape,
  projectId: z.uuid()
})

export const projectMediaParamsSchema = z.strictObject({
  ...workspaceParamsShape,
  projectId: z.uuid(),
  projectMediaId: z.uuid()
})

export const createBlankProjectSchema = z.strictObject({
  title: z.string().trim().min(1).max(255)
})

export const createProjectFromMediaSchema = z.strictObject({
  mediaId: z.uuid(),
  title: z.string().trim().min(1).max(255)
})

export const listProjectsQuerySchema = z.strictObject({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
  search: z.string().trim().min(1).max(255).optional(),
  status: z.enum([ProjectStatus.DRAFT, ProjectStatus.ACTIVE, ProjectStatus.ARCHIVED]).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title']).default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

export const updateProjectSchema = z
  .strictObject({
    title: z.string().trim().min(1).max(255).optional(),
    status: z.enum([ProjectStatus.DRAFT, ProjectStatus.ACTIVE, ProjectStatus.ARCHIVED]).optional()
  })
  .refine((value) => Object.hasOwn(value, 'title') || Object.hasOwn(value, 'status'), {
    message: 'At least one field is required'
  })

export const setProjectSourceMediaSchema = z.strictObject({
  mediaId: z.uuid()
})

export const addProjectMediaSchema = z.strictObject({
  mediaId: z.uuid()
})

export type ProjectParams = z.infer<typeof projectParamsSchema>
export type ProjectMediaParams = z.infer<typeof projectMediaParamsSchema>
export type CreateBlankProjectBody = z.infer<typeof createBlankProjectSchema>
export type CreateProjectFromMediaBody = z.infer<typeof createProjectFromMediaSchema>
export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>
export type UpdateProjectBody = z.infer<typeof updateProjectSchema>
export type SetProjectSourceMediaBody = z.infer<typeof setProjectSourceMediaSchema>
export type AddProjectMediaBody = z.infer<typeof addProjectMediaSchema>
