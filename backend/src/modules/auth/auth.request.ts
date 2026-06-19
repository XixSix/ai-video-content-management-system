import type { Request } from 'express'
import { config } from '../../config'
import { AuthError } from './auth.error'
import type { RequestMetadata, RequestMetadataSource } from './auth.types'

export const getRequestMetadata = (req: RequestMetadataSource): RequestMetadata => ({
  userAgent: req.header('user-agent'),
  ipAddress: req.ip
})

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
