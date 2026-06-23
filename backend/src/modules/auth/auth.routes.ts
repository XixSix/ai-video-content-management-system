import { Router } from 'express'
import * as authController from './auth.controller'
import { loginSchema, registerSchema } from './auth.schema'
import { authenticate } from '../../middleware/auth.middleware'
import { loginRateLimiter, refreshRateLimiter, registerRateLimiter } from '../../middleware/auth-rate-limit.middleware'
import { validateRequest } from '../../middleware/validate-request'

const router = Router()

router.post('/register', registerRateLimiter, validateRequest({ body: registerSchema }), authController.register)
router.post('/login', loginRateLimiter, validateRequest({ body: loginSchema }), authController.login)
router.post('/refresh', refreshRateLimiter, authController.refresh)
router.post('/logout', authController.logout)
router.post('/logout-all', authenticate, authController.logoutAll)
router.get('/me', authenticate, authController.me)

export { router as authRoutes }
