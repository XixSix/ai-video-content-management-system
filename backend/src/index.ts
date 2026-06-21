import { app } from './app'
import { config } from './config/index'
import { connectRabbitMQ, disconnectRabbitMQ } from './infrastructure/rabbitmq/client'
import { connectRedis, disconnectRedis } from './infrastructure/redis/client'
import {
  connectNotificationRealtime,
  disconnectNotificationRealtime
} from './modules/notifications/notifications.realtime'

let server: ReturnType<typeof app.listen> | undefined

const disconnectRedisInfrastructure = async (): Promise<void> => {
  try {
    await disconnectNotificationRealtime()
  } finally {
    await disconnectRedis()
  }
}

const shutdown = (signal: NodeJS.Signals): void => {
  console.log(`${signal} received. Shutting down gracefully.`)

  const closeInfrastructure = (): void => {
    Promise.all([disconnectRabbitMQ(), disconnectRedisInfrastructure()])
      .then(() => {
        process.exit(0)
      })
      .catch((disconnectError: unknown) => {
        console.error('Failed to close infrastructure connections', disconnectError)
        process.exit(1)
      })
  }

  if (!server) {
    closeInfrastructure()
    return
  }

  server.close((error?: Error): void => {
    if (error) {
      console.error('Failed to close server', error)
      process.exit(1)
    }

    closeInfrastructure()
  })
}

const bootstrap = async (): Promise<void> => {
  try {
    await Promise.all([connectRabbitMQ(), connectRedis()])
    await connectNotificationRealtime()
    console.log('RabbitMQ, Redis, and notification realtime connected')

    server = app.listen(config.app.port, (): void => {
      console.log(`Server is running on port ${config.app.port}`)
    })
  } catch (error: unknown) {
    console.error('Failed to connect infrastructure services', error)
    await Promise.allSettled([disconnectRabbitMQ(), disconnectRedisInfrastructure()])
    process.exit(1)
  }
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

void bootstrap()
