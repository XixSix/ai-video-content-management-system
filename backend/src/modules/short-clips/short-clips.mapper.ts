import type { ClipCandidate, ProcessingJob, ShortClip } from '../../infrastructure/db/generated/prisma/client'
import type { JobResponseData } from '../jobs/jobs.types'
import type { ClipCandidateData, ShortClipAssetData, ShortClipData, ShortClipRecord } from './short-clips.types'

export const toJobResponseData = (job: ProcessingJob): JobResponseData => ({
  id: job.id,
  mediaId: job.mediaId,
  jobType: job.jobType,
  status: job.status,
  progress: job.progress,
  errorMessage: job.errorMessage,
  output: job.output,
  attemptCount: job.attemptCount,
  createdAt: job.createdAt,
  updatedAt: job.updatedAt,
  startedAt: job.startedAt,
  completedAt: job.completedAt
})

export const toClipCandidateData = (candidate: ClipCandidate): ClipCandidateData => ({
  id: candidate.id,
  mediaId: candidate.mediaId,
  userId: candidate.userId,
  transcriptId: candidate.transcriptId,
  chapterId: candidate.chapterId,
  jobId: candidate.jobId,
  projectId: candidate.projectId,
  startTime: candidate.startTime,
  endTime: candidate.endTime,
  duration: candidate.duration,
  transcriptVersion: candidate.transcriptVersion,
  title: candidate.title,
  reason: candidate.reason,
  score: candidate.score,
  text: candidate.text,
  metadata: candidate.metadata,
  status: candidate.status,
  createdAt: candidate.createdAt
})

const toShortClipAssetData = (asset: ShortClipRecord['generatedAssets'][number]): ShortClipAssetData => ({
  id: asset.id,
  assetType: asset.assetType,
  transcriptVersion: asset.transcriptVersion,
  mimeType: asset.mimeType,
  fileSizeBytes: asset.fileSizeBytes?.toString() ?? null,
  metadata: asset.metadata,
  createdAt: asset.createdAt
})

export const toShortClipData = (clip: ShortClipRecord | ShortClip): ShortClipData => ({
  id: clip.id,
  mediaId: clip.mediaId,
  userId: clip.userId,
  candidateId: clip.candidateId,
  projectId: clip.projectId,
  aspectRatio: clip.aspectRatio,
  status: clip.status,
  candidate: 'candidate' in clip && clip.candidate ? toClipCandidateData(clip.candidate) : null,
  assets: 'generatedAssets' in clip ? clip.generatedAssets.map(toShortClipAssetData) : [],
  createdAt: clip.createdAt,
  updatedAt: clip.updatedAt
})
