import type { ClipCandidate, ProcessingJob, ShortClip } from '../../infrastructure/db/generated/prisma/client'
import type { JobResponseData } from '../jobs/jobs.types'
import type { ClipCandidateData, ShortClipData } from './short-clips.types'

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
  transcriptId: candidate.transcriptId,
  chapterId: candidate.chapterId,
  jobId: candidate.jobId,
  startTime: candidate.startTime,
  endTime: candidate.endTime,
  duration: candidate.duration,
  transcriptVersion: candidate.transcriptVersion,
  text: candidate.text,
  cleanText: candidate.cleanText,
  hookScore: candidate.hookScore,
  questionScore: candidate.questionScore,
  keywordScore: candidate.keywordScore,
  durationScore: candidate.durationScore,
  speechDensityScore: candidate.speechDensityScore,
  saliencyScore: candidate.saliencyScore,
  completenessScore: candidate.completenessScore,
  emotionScore: candidate.emotionScore,
  finalScore: candidate.finalScore,
  llmScore: candidate.llmScore,
  llmReason: candidate.llmReason,
  dedupGroupId: candidate.dedupGroupId,
  metadata: candidate.metadata,
  status: candidate.status,
  createdAt: candidate.createdAt
})

export const toShortClipData = (clip: ShortClip): ShortClipData => ({
  id: clip.id,
  mediaId: clip.mediaId,
  userId: clip.userId,
  transcriptId: clip.transcriptId,
  chapterId: clip.chapterId,
  candidateId: clip.candidateId,
  title: clip.title,
  caption: clip.caption,
  description: clip.description,
  hashtags: clip.hashtags,
  startTime: clip.startTime,
  endTime: clip.endTime,
  duration: clip.duration,
  transcriptVersion: clip.transcriptVersion,
  score: clip.score,
  reason: clip.reason,
  videoPath: clip.videoPath,
  thumbnailPath: clip.thumbnailPath,
  subtitlePath: clip.subtitlePath,
  aspectRatio: clip.aspectRatio,
  status: clip.status,
  createdAt: clip.createdAt,
  updatedAt: clip.updatedAt
})
