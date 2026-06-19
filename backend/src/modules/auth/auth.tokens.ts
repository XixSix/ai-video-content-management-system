import crypto from 'node:crypto'
import jwt, { type JwtPayload } from 'jsonwebtoken'
import { config } from '../../config'
import { AuthError } from './auth.error'
import type { AccessTokenPayload, RefreshTokenPayload, SessionTokenResult } from './auth.types'

export const signAccessToken = (userId: string): string =>
  jwt.sign({ type: 'access', userId }, config.security.jwtSecret, {
    algorithm: config.security.jwtAlgorithm,
    expiresIn: config.security.accessTokenExpiresIn
  })

export const createRefreshToken = (userId: string): SessionTokenResult => {
  const jti: string = crypto.randomUUID()
  const expiresAt: number = Math.floor(Date.now() / 1000) + config.security.refreshTokenExpiresIn
  const refreshToken: string = jwt.sign({ type: 'refresh', exp: expiresAt }, config.security.refreshTokenSecret, {
    algorithm: config.security.jwtAlgorithm,
    jwtid: jti,
    subject: userId
  })

  return {
    jti,
    refreshToken,
    refreshExpiresAt: new Date(expiresAt * 1000)
  }
}

export const verifyAccessToken = (accessToken: string): AccessTokenPayload => {
  try {
    const decoded = jwt.verify(accessToken, config.security.jwtSecret, {
      algorithms: [config.security.jwtAlgorithm]
    })

    if (!isAccessTokenPayload(decoded)) {
      throw AuthError.unauthorized('Invalid access token')
    }

    return decoded
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      throw error
    }

    throw AuthError.unauthorized('Invalid access token')
  }
}

export const verifyRefreshToken = (refreshToken: string): RefreshTokenPayload => {
  try {
    const decoded = jwt.verify(refreshToken, config.security.refreshTokenSecret, {
      algorithms: [config.security.jwtAlgorithm]
    })

    if (!isRefreshTokenPayload(decoded)) {
      throw AuthError.unauthorized('Invalid refresh token')
    }

    return decoded
  } catch (error: unknown) {
    if (error instanceof AuthError) {
      throw error
    }

    throw AuthError.unauthorized('Invalid refresh token')
  }
}

const isAccessTokenPayload = (value: string | JwtPayload): value is AccessTokenPayload =>
  typeof value === 'object' && value !== null && value.type === 'access' && typeof value.userId === 'string'

const isRefreshTokenPayload = (value: string | JwtPayload): value is RefreshTokenPayload =>
  typeof value === 'object' &&
  value !== null &&
  value.type === 'refresh' &&
  typeof value.sub === 'string' &&
  typeof value.jti === 'string' &&
  typeof value.exp === 'number'
