import { describe, expect, it } from '@jest/globals'
import request from 'supertest'
import { app } from '../../app'

describe('health routes', () => {
  it('returns service health', async () => {
    const response = await request(app).get('/api/health')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      success: true,
      data: {
        status: 'ok',
        environment: 'test'
      }
    })
  })
})
