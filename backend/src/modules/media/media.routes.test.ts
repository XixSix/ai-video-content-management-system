import { describe, expect, it } from '@jest/globals'
import request from 'supertest'
import { app } from '../../app'

describe('media routes', () => {
  it.each([
    ['GET', '/api/v1/media'],
    ['POST', '/api/v1/media/upload-url'],
    ['POST', '/api/v1/media/complete-upload'],
    ['POST', '/api/v1/media/abort-upload'],
    ['GET', '/api/v1/media/00000000-0000-4000-8000-000000000001'],
    ['GET', '/api/v1/media/00000000-0000-4000-8000-000000000001/download-url'],
    ['PATCH', '/api/v1/media/00000000-0000-4000-8000-000000000001'],
    ['DELETE', '/api/v1/media/00000000-0000-4000-8000-000000000001']
  ])('%s %s requires an access token', async (method, path) => {
    const response = await request(app)[method.toLowerCase() as 'get' | 'post' | 'patch' | 'delete'](path).send({})

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
