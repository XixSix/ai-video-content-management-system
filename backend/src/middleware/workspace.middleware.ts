import type { RequestHandler } from 'express'
import * as authService from '../modules/auth/auth.service'
import { AuthError } from '../modules/auth/auth.error'

export const requireWorkspaceMembership: RequestHandler = async (req, _res, next): Promise<void> => {
  try {
    if (!req.user) {
      throw AuthError.unauthorized('Authentication is required')
    }

    req.workspace = await authService.getDefaultWorkspaceMembership(req.user.id)
    next()
  } catch (error: unknown) {
    next(error)
  }
}
