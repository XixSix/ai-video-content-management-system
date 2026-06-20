import type { AuthenticatedUser, WorkspaceContext } from './modules/auth/auth.types'

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser
      workspace?: WorkspaceContext
    }
  }
}

export {}
