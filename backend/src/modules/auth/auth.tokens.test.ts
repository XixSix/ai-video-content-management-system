import { describe, expect, it } from '@jest/globals'
import jwt from 'jsonwebtoken'
import { config } from '../../config'
import { createRefreshToken, signAccessToken, verifyAccessToken, verifyRefreshToken } from './auth.tokens'

describe('auth tokens', () => {
  it('creates a signed access JWT with required claims', () => {
    const payload = verifyAccessToken(signAccessToken('123e4567-e89b-12d3-a456-426614174000'))

    expect(payload).toMatchObject({
      type: 'access',
      userId: '123e4567-e89b-12d3-a456-426614174000'
    })
  })

  it('creates a signed refresh JWT with required claims', () => {
    const result = createRefreshToken('123e4567-e89b-12d3-a456-426614174000')
    const payload = verifyRefreshToken(result.refreshToken)

    expect(payload).toMatchObject({
      sub: '123e4567-e89b-12d3-a456-426614174000',
      jti: result.jti,
      type: 'refresh'
    })
    expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000))
    expect(result.refreshExpiresAt.getTime()).toBe(payload.exp * 1000)
  })

  it('rejects a refresh JWT signed with a different secret', () => {
    const token = jwt.sign(
      {
        type: 'refresh'
      },
      'different-refresh-secret-with-32-characters',
      {
        algorithm: 'HS256',
        expiresIn: 60,
        jwtid: '123e4567-e89b-12d3-a456-426614174001',
        subject: '123e4567-e89b-12d3-a456-426614174000'
      }
    )

    expect(() => verifyRefreshToken(token)).toThrow('Invalid refresh token')
  })

  it('rejects refresh JWTs with an invalid type or missing jti', () => {
    const invalidTypeToken = jwt.sign(
      {
        type: 'access'
      },
      config.security.refreshTokenSecret,
      {
        algorithm: 'HS256',
        expiresIn: 60,
        jwtid: '123e4567-e89b-12d3-a456-426614174001',
        subject: '123e4567-e89b-12d3-a456-426614174000'
      }
    )
    const missingJtiToken = jwt.sign(
      {
        type: 'refresh'
      },
      config.security.refreshTokenSecret,
      {
        algorithm: 'HS256',
        expiresIn: 60,
        subject: '123e4567-e89b-12d3-a456-426614174000'
      }
    )

    expect(() => verifyRefreshToken(invalidTypeToken)).toThrow('Invalid refresh token')
    expect(() => verifyRefreshToken(missingJtiToken)).toThrow('Invalid refresh token')
  })

  it('rejects an expired refresh JWT', () => {
    const expiredToken = jwt.sign(
      {
        type: 'refresh'
      },
      config.security.refreshTokenSecret,
      {
        algorithm: 'HS256',
        expiresIn: -1,
        jwtid: '123e4567-e89b-12d3-a456-426614174001',
        subject: '123e4567-e89b-12d3-a456-426614174000'
      }
    )

    expect(() => verifyRefreshToken(expiredToken)).toThrow('Invalid refresh token')
  })
})
