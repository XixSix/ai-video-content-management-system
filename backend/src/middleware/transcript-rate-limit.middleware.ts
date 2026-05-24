import rateLimit, { ipKeyGenerator } from 'express-rate-limit'
import { config } from '../config'

export const transcriptGenerateRateLimiter = rateLimit({
  windowMs: config.rateLimit.transcriptGenerateWindowMs,
  limit: config.rateLimit.transcriptGenerateLimit,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req): string => {
    if (req.user?.id) {
      return `user:${req.user.id}`
    }

    return ipKeyGenerator(req.ip ?? 'unknown')
  },
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many transcript generation requests'
    }
  }
})
