import { describe, expect, it } from '@jest/globals'
import request from 'supertest'
import { app } from '../../app'

describe('auth routes', () => {
  describe('POST /api/v1/auth/register', () => {
    it('returns validation errors for invalid register payload', async () => {
      const response = await request(app).post('/api/v1/auth/register').send({
        email: 'not-an-email',
        password: 'short'
      })

      expect(response.status).toBe(400)
      expect(response.body.success).toBe(false)
      expect(response.body.error).toMatchObject({
        code: 'VALIDATION_ERROR',
        message: 'Validation failed'
      })
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: 'email',
            code: 'invalid_format'
          }),
          expect.objectContaining({
            path: 'password'
          })
        ])
      )
    })
  })

  describe('POST /api/v1/auth/login', () => {
    it('returns validation errors for invalid login payload', async () => {
      const response = await request(app).post('/api/v1/auth/login').send({
        email: 'not-an-email',
        password: ''
      })

      expect(response.status).toBe(400)
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed'
        }
      })
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: 'email'
          }),
          expect.objectContaining({
            path: 'password'
          })
        ])
      )
    })
  })

  describe('GET /api/v1/auth/me', () => {
    it('requires an access token', async () => {
      const response = await request(app).get('/api/v1/auth/me')

      expect(response.status).toBe(401)
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing access token'
        }
      })
    })
  })
})
