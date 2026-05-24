import crypto from 'node:crypto'
import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken'
import { config } from '../../config'
import { AuthError } from './auth.error'
import type { AccessTokenPayload } from './auth.types'

export const generateRefreshToken = (): string => crypto.randomBytes(64).toString('base64url')

export const signAccessToken = (userId: string): string =>
  jwt.sign({ userId }, config.security.jwtSecret, {
    expiresIn: config.security.accessTokenExpiresIn as SignOptions['expiresIn']
  })

export const verifyAccessToken = (accessToken: string): AccessTokenPayload => {
  try {
    const decoded = jwt.verify(accessToken, config.security.jwtSecret)

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

const isAccessTokenPayload = (value: string | JwtPayload): value is AccessTokenPayload =>
  typeof value === 'object' && value !== null && typeof value.userId === 'string'
