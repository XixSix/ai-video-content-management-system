import { config } from '../../config/index'
import * as healthRepo from './health.repository'

export type DependencyStatus = 'ok' | 'down'
export type HealthStatus = 'ok' | 'degraded'
export type DependencyName = 'database' | 'redis' | 'rabbitmq' | 'objectStorage'

export interface DependencyHealth {
  status: DependencyStatus
  latencyMs: number
  message?: string
}

export interface HealthCheck {
  status: HealthStatus
  environment: string
  checks: Record<DependencyName, DependencyHealth>
}

const getErrorMessage = (error: unknown, dependency: DependencyName): string =>
  error instanceof Error ? error.message : `${dependency} health check failed`

const checkDependency = async (dependency: DependencyName, check: () => Promise<void>): Promise<DependencyHealth> => {
  const startTime = Date.now()

  try {
    await check()

    return {
      status: 'ok',
      latencyMs: Date.now() - startTime
    }
  } catch (error: unknown) {
    return {
      status: 'down',
      latencyMs: Date.now() - startTime,
      message: getErrorMessage(error, dependency)
    }
  }
}

export const getHealth = async (): Promise<HealthCheck> => {
  const [database, redis, rabbitmq, objectStorage] = await Promise.all([
    checkDependency('database', healthRepo.checkDatabaseConnection),
    checkDependency('redis', healthRepo.checkRedisConnection),
    checkDependency('rabbitmq', healthRepo.checkRabbitMQConnection),
    checkDependency('objectStorage', healthRepo.checkObjectStorageConnection)
  ])
  const checks: HealthCheck['checks'] = {
    database,
    redis,
    rabbitmq,
    objectStorage
  }
  const isHealthy = Object.values(checks).every((check) => check.status === 'ok')

  return {
    status: isHealthy ? 'ok' : 'degraded',
    environment: config.app.nodeEnv,
    checks
  }
}
