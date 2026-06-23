import { JobStatus, JobType, MediaStatus, MediaType } from '../../infrastructure/db/generated/prisma/client'
import { toJobResponseData } from './render-exports.mapper'
import * as renderExportsQueue from './render-exports.queue'
import * as renderExportsRepo from './render-exports.repository'
import { RenderExportsError } from './render-exports.error'
import {
  EXPORT_RENDER_TASK_NAME,
  RENDER_EXPORTS_QUEUE_NAME,
  type CreateRenderExportResult
} from './render-exports.types'

export const createRenderExport = async (
  userId: string,
  workspaceId: string,
  projectId: string
): Promise<CreateRenderExportResult> => {
  const project = await renderExportsRepo.findProjectForRenderExport(projectId, workspaceId)

  if (!project || renderExportsRepo.isDeletedProject(project.status)) {
    throw RenderExportsError.projectNotFound()
  }

  if (project.userId !== userId) {
    throw RenderExportsError.forbidden()
  }

  if (!project.sourceMedia) {
    throw RenderExportsError.sourceMediaRequired()
  }

  if (project.sourceMedia.status !== MediaStatus.UPLOADED) {
    throw RenderExportsError.invalidSourceMedia(`Cannot export source media in status ${project.sourceMedia.status}`)
  }

  if (project.sourceMedia.type !== MediaType.VIDEO) {
    throw RenderExportsError.invalidSourceMedia('Render export requires video source media')
  }

  if (!project.editorSnapshot) {
    throw RenderExportsError.snapshotRequired()
  }

  const activeJob = await renderExportsRepo.findActiveRenderExportJob(project.id, userId)

  if (activeJob) {
    return {
      job: toJobResponseData(activeJob),
      wasCreated: false
    }
  }

  const job = await renderExportsRepo.createProcessingJob({
    mediaId: project.sourceMedia.id,
    userId,
    projectId: project.id,
    jobType: JobType.EXPORT_RENDER,
    status: JobStatus.PENDING,
    progress: 0,
    queueName: RENDER_EXPORTS_QUEUE_NAME,
    taskName: EXPORT_RENDER_TASK_NAME,
    input: {
      projectId: project.id,
      workspaceId,
      mediaId: project.sourceMedia.id,
      editorSnapshotId: project.editorSnapshot.id,
      editorSnapshotVersion: project.editorSnapshot.version
    }
  })

  try {
    await renderExportsQueue.publishRenderExportJob({
      jobId: job.id,
      mediaId: project.sourceMedia.id,
      projectId: project.id,
      workspaceId,
      userId
    })
  } catch {
    await renderExportsRepo.updateProcessingJob(job.id, {
      status: JobStatus.FAILED,
      progress: 0,
      errorMessage: 'Failed to publish render export job',
      completedAt: new Date()
    })

    throw RenderExportsError.queuePublishFailed()
  }

  return {
    job: toJobResponseData(job),
    wasCreated: true
  }
}
