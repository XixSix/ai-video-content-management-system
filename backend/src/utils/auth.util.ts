import type { Request } from 'express'
import type { User } from '../infrastructure/db/generated/prisma/client'
import { config } from '../config'
import { AuthError } from '../modules/auth/auth.error'
import type { AuthenticatedUser, RequestMetadata, RequestMetadataSource } from '../types/auth'

export const toAuthenticatedUser = (user: User): AuthenticatedUser => ({
  id: user.id,
  email: user.email,
  role: user.role,
  status: user.status
})

export const getRequestMetadata = (req: RequestMetadataSource): RequestMetadata => ({
  userAgent: req.header('user-agent'),
  ipAddress: req.ip
})

export const getRefreshExpiresAt = (): Date => {
  return new Date(Date.now() + config.security.refreshTokenTTLMs)
}

export const getRefreshTokenFromCookie = (req: Request): string => {
  const refreshToken = getOptionalRefreshTokenFromCookie(req)

  if (!refreshToken) {
    throw AuthError.unauthorized('Missing refresh token')
  }

  return refreshToken
}

export const getOptionalRefreshTokenFromCookie = (req: Request): string | undefined => {
  const cookies: unknown = req.cookies

  if (typeof cookies !== 'object' || cookies === null || !(config.cookie.refreshName in cookies)) {
    return undefined
  }

  const refreshToken = cookies[config.cookie.refreshName as keyof typeof cookies]
  return typeof refreshToken === 'string' ? refreshToken : undefined
}

export const getBearerToken = (req: Request): string => {
  const authorization = req.header('authorization')

  if (!authorization) {
    throw AuthError.unauthorized('Missing access token')
  }

  const [scheme, token] = authorization.split(' ')

  if (scheme !== 'Bearer' || !token) {
    throw AuthError.unauthorized('Invalid authorization header')
  }

  return token
}
