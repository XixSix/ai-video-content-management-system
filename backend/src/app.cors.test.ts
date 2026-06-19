import { describe, expect, it } from '@jest/globals'
import request from 'supertest'
import { app } from './app'

describe('CORS', () => {
  it('allows the configured frontend origin with credentials', async () => {
    const response = await request(app)
      .options('/api/v1/auth/login')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'Content-Type,Authorization')

    expect(response.status).toBe(204)
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173')
    expect(response.headers['access-control-allow-credentials']).toBe('true')
    expect(response.headers['access-control-allow-headers']).toContain('Authorization')
    expect(response.headers['access-control-allow-headers']).toContain('Content-Type')
  })

  it('does not emit CORS allow headers for an unconfigured origin', async () => {
    const response = await request(app).get('/api/v1/health').set('Origin', 'https://untrusted.example.com')

    expect(response.headers['access-control-allow-origin']).toBeUndefined()
    expect(response.headers['access-control-allow-credentials']).toBeUndefined()
  })

  it('allows server-to-server requests without an Origin header', async () => {
    const response = await request(app).get('/api/v1/health')

    expect(response.status).not.toBe(403)
  })
})
