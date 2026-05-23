import rateLimit from 'express-rate-limit'
import { config } from '../config'

const createAuthRateLimiter = (limit: number, message: string) =>
  rateLimit({
    windowMs: config.rateLimit.authWindowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message
      }
    }
  })

export const registerRateLimiter = createAuthRateLimiter(
  config.rateLimit.registerLimit,
  'Too many registration attempts'
)

export const loginRateLimiter = createAuthRateLimiter(config.rateLimit.loginLimit, 'Too many login attempts')

export const refreshRateLimiter = createAuthRateLimiter(
  config.rateLimit.refreshLimit,
  'Too many token refresh attempts'
)
