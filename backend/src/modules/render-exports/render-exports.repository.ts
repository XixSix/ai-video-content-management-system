import { prisma } from '../../infrastructure/db/prisma'
import {
  JobStatus,
  JobType,
  Prisma,
  type ProcessingJob,
  type ProjectStatus
} from '../../infrastructure/db/generated/prisma/client'

const exportProjectArgs = {
  include: {
    sourceMedia: true,
    editorSnapshot: true
  }
} satisfies Prisma.ProjectDefaultArgs

export type RenderExportProjectRecord = Prisma.ProjectGetPayload<typeof exportProjectArgs>

const activeJobStatuses: JobStatus[] = [JobStatus.PENDING, JobStatus.QUEUED, JobStatus.RUNNING]

export const findProjectForRenderExport = async (
  projectId: string,
  workspaceId: string
): Promise<RenderExportProjectRecord | null> =>
  prisma.project.findFirst({
    where: {
      id: projectId,
      workspaceId
    },
    ...exportProjectArgs
  })

export const findActiveRenderExportJob = async (projectId: string, userId: string): Promise<ProcessingJob | null> =>
  prisma.processingJob.findFirst({
    where: {
      projectId,
      userId,
      jobType: JobType.EXPORT_RENDER,
      status: {
        in: activeJobStatuses
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

export const createProcessingJob = async (data: Prisma.ProcessingJobUncheckedCreateInput): Promise<ProcessingJob> =>
  prisma.processingJob.create({ data })

export const updateProcessingJob = async (
  id: string,
  data: Prisma.ProcessingJobUncheckedUpdateInput
): Promise<ProcessingJob> =>
  prisma.processingJob.update({
    where: { id },
    data
  })

export const isDeletedProject = (status: ProjectStatus): boolean => status === 'DELETED'
