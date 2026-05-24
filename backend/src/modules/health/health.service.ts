import { config } from '../../config/index'
import * as healthRepo from './health.repository'

export type DependencyStatus = 'ok' | 'down'
export type HealthStatus = 'ok' | 'degraded'

export interface DependencyHealth {
  status: DependencyStatus
  latencyMs: number
  message?: string
}

export interface HealthCheck {
  status: HealthStatus
  environment: string
  checks: {
    database: DependencyHealth
  }
}

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Database health check failed'

export const getHealth = async (): Promise<HealthCheck> => {
  const startTime = Date.now()

  try {
    await healthRepo.checkDatabaseConnection()

    return {
      status: 'ok',
      environment: config.app.nodeEnv,
      checks: {
        database: {
          status: 'ok',
          latencyMs: Date.now() - startTime
        }
      }
    }
  } catch (error: unknown) {
    return {
      status: 'degraded',
      environment: config.app.nodeEnv,
      checks: {
        database: {
          status: 'down',
          latencyMs: Date.now() - startTime,
          message: getErrorMessage(error)
        }
      }
    }
  }
}
