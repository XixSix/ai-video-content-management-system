import { Router } from 'express'
import { assetsRoutes } from './assets/assets.routes'
import { authRoutes } from './auth/auth.routes'
import { mediaChapterRoutes } from './chaptering/chaptering.routes'
import { editorSnapshotsRoutes } from './editor-snapshots/editor-snapshots.routes'
import { healthRouter } from './health/health.routes'
import { jobsRoutes } from './jobs/jobs.routes'
import { mediaRoutes } from './media/media.routes'
import { notificationsRoutes } from './notifications/notifications.routes'
import { platformAccountsRoutes } from './platform-accounts/platform-accounts.routes'
import { projectsRoutes } from './projects/projects.routes'
import { publishTasksRoutes } from './publish-tasks/publish-tasks.routes'
import { clipCandidatesRoutes, mediaShortClipRoutes, shortClipsRoutes } from './short-clips/short-clips.routes'
import { mediaTranscriptRoutes, transcriptsRoutes } from './transcripts/transcripts.routes'
import { workspaceRoutes } from './workspace/workspace.routes'
import {
  workspaceInvitationActionRoutes,
  workspaceInvitationCreateRoutes
} from './workspace-invitations/workspace-invitations.routes'

export const apiRouter = Router()

apiRouter.use('/assets', assetsRoutes)
apiRouter.use('/auth', authRoutes)
apiRouter.use('/media', mediaTranscriptRoutes)
apiRouter.use('/media', mediaChapterRoutes)
apiRouter.use('/media', mediaShortClipRoutes)
apiRouter.use('/platform-accounts', platformAccountsRoutes)
apiRouter.use('/workspaces/:workspaceId/media', mediaRoutes)
apiRouter.use('/workspaces/:workspaceId/projects', editorSnapshotsRoutes)
apiRouter.use('/workspaces/:workspaceId/projects', projectsRoutes)
apiRouter.use('/publish-tasks', publishTasksRoutes)
apiRouter.use('/transcripts', transcriptsRoutes)
apiRouter.use('/clip-candidates', clipCandidatesRoutes)
apiRouter.use('/short-clips', shortClipsRoutes)
apiRouter.use('/workspaces', workspaceInvitationCreateRoutes)
apiRouter.use('/workspaces', workspaceRoutes)
apiRouter.use('/workspace-invitations', workspaceInvitationActionRoutes)
apiRouter.use('/notifications', notificationsRoutes)
apiRouter.use('/jobs', jobsRoutes)
apiRouter.use(healthRouter)
