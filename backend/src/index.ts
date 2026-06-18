import { app } from './app'
import { config } from './config/index'
import { connectRabbitMQ, disconnectRabbitMQ } from './infrastructure/rabbitmq/client'
import { connectRedis, disconnectRedis } from './infrastructure/redis/client'

let server: ReturnType<typeof app.listen> | undefined

const shutdown = (signal: NodeJS.Signals): void => {
  console.log(`${signal} received. Shutting down gracefully.`)

  const closeInfrastructure = (): void => {
    Promise.all([disconnectRabbitMQ(), disconnectRedis()])
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
    console.log('RabbitMQ and Redis connected')

    server = app.listen(config.app.port, (): void => {
      console.log(`Server is running on port ${config.app.port}`)
    })
  } catch (error: unknown) {
    console.error('Failed to connect infrastructure services', error)
    await Promise.allSettled([disconnectRabbitMQ(), disconnectRedis()])
    process.exit(1)
  }
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

void bootstrap()
