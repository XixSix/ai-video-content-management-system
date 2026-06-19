import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import request from 'supertest'
import type { HealthCheck } from './health.service'

const getHealthMock = jest.fn<() => Promise<HealthCheck>>()

jest.unstable_mockModule('./health.service', () => ({
  getHealth: getHealthMock
}))

const { app } = await import('../../app')

describe('health routes', () => {
  beforeEach(() => {
    getHealthMock.mockResolvedValue({
      status: 'ok',
      environment: 'test',
      checks: {
        database: {
          status: 'ok',
          latencyMs: 5
        },
        redis: {
          status: 'ok',
          latencyMs: 2
        },
        rabbitmq: {
          status: 'ok',
          latencyMs: 3
        },
        objectStorage: {
          status: 'ok',
          latencyMs: 4
        }
      }
    })
  })

  it('returns service health', async () => {
    const response = await request(app).get('/api/v1/health')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      success: true,
      data: {
        status: 'ok',
        environment: 'test',
        checks: {
          database: {
            status: 'ok',
            latencyMs: 5
          },
          redis: {
            status: 'ok',
            latencyMs: 2
          },
          rabbitmq: {
            status: 'ok',
            latencyMs: 3
          },
          objectStorage: {
            status: 'ok',
            latencyMs: 4
          }
        }
      }
    })
  })

  it('returns degraded health when database is unavailable', async () => {
    getHealthMock.mockResolvedValue({
      status: 'degraded',
      environment: 'test',
      checks: {
        database: {
          status: 'down',
          latencyMs: 12,
          message: 'connection refused'
        },
        redis: {
          status: 'ok',
          latencyMs: 2
        },
        rabbitmq: {
          status: 'ok',
          latencyMs: 3
        },
        objectStorage: {
          status: 'ok',
          latencyMs: 4
        }
      }
    })

    const response = await request(app).get('/api/v1/health')

    expect(response.status).toBe(503)
    expect(response.body).toEqual({
      success: false,
      data: {
        status: 'degraded',
        environment: 'test',
        checks: {
          database: {
            status: 'down',
            latencyMs: 12,
            message: 'connection refused'
          },
          redis: {
            status: 'ok',
            latencyMs: 2
          },
          rabbitmq: {
            status: 'ok',
            latencyMs: 3
          },
          objectStorage: {
            status: 'ok',
            latencyMs: 4
          }
        }
      }
    })
  })
})
