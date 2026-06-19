import { beforeEach, describe, expect, it, jest } from '@jest/globals'

const checkDatabaseConnectionMock = jest.fn<() => Promise<void>>()
const checkRedisConnectionMock = jest.fn<() => Promise<void>>()
const checkRabbitMQConnectionMock = jest.fn<() => Promise<void>>()
const checkObjectStorageConnectionMock = jest.fn<() => Promise<void>>()

jest.unstable_mockModule('./health.repository', () => ({
  checkDatabaseConnection: checkDatabaseConnectionMock,
  checkRedisConnection: checkRedisConnectionMock,
  checkRabbitMQConnection: checkRabbitMQConnectionMock,
  checkObjectStorageConnection: checkObjectStorageConnectionMock
}))

const healthService = await import('./health.service')

beforeEach(() => {
  jest.resetAllMocks()
  checkDatabaseConnectionMock.mockResolvedValue()
  checkRedisConnectionMock.mockResolvedValue()
  checkRabbitMQConnectionMock.mockResolvedValue()
  checkObjectStorageConnectionMock.mockResolvedValue()
})

describe('health service', () => {
  it('returns ok when every backend dependency is reachable', async () => {
    const result = await healthService.getHealth()

    expect(result.status).toBe('ok')
    expect(result.checks).toEqual({
      database: {
        status: 'ok',
        latencyMs: expect.any(Number)
      },
      redis: {
        status: 'ok',
        latencyMs: expect.any(Number)
      },
      rabbitmq: {
        status: 'ok',
        latencyMs: expect.any(Number)
      },
      objectStorage: {
        status: 'ok',
        latencyMs: expect.any(Number)
      }
    })
  })

  it('returns every check and degrades when one dependency is down', async () => {
    checkRedisConnectionMock.mockRejectedValue(new Error('Redis is unavailable'))

    const result = await healthService.getHealth()

    expect(result.status).toBe('degraded')
    expect(result.checks.redis).toEqual({
      status: 'down',
      latencyMs: expect.any(Number),
      message: 'Redis is unavailable'
    })
    expect(result.checks.database.status).toBe('ok')
    expect(result.checks.rabbitmq.status).toBe('ok')
    expect(result.checks.objectStorage.status).toBe('ok')
    expect(checkDatabaseConnectionMock).toHaveBeenCalledTimes(1)
    expect(checkRedisConnectionMock).toHaveBeenCalledTimes(1)
    expect(checkRabbitMQConnectionMock).toHaveBeenCalledTimes(1)
    expect(checkObjectStorageConnectionMock).toHaveBeenCalledTimes(1)
  })
})
