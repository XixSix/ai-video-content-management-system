import type { RequestHandler } from 'express'
import * as authService from '../modules/auth/auth.service'
import { getBearerToken } from '../utils/auth.util'

export const authenticate: RequestHandler = async (req, _res, next): Promise<void> => {
  try {
    const accessToken = getBearerToken(req)
    req.user = await authService.getAuthenticatedUser(accessToken)
    next()
  } catch (error: unknown) {
    next(error)
  }
}
