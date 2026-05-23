import { describe, expect, it } from '@jest/globals'
import request from 'supertest'
import { app } from '../../app'

describe('media routes', () => {
  it.each([
    ['POST', '/api/v1/media/upload-url'],
    ['POST', '/api/v1/media/complete-upload'],
    ['POST', '/api/v1/media/abort-upload']
  ])('%s %s requires an access token', async (method, path) => {
    const response = await request(app)[method.toLowerCase() as 'post'](path).send({})

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
