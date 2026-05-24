import { app } from './app'
import { config } from './config/index'
import { connectRabbitMQ, disconnectRabbitMQ } from './infrastructure/rabbitmq/client'

let server: ReturnType<typeof app.listen> | undefined

const shutdown = (signal: NodeJS.Signals): void => {
  console.log(`${signal} received. Shutting down gracefully.`)

  const closeRabbitMQ = (): void => {
    disconnectRabbitMQ()
      .then(() => {
        process.exit(0)
      })
      .catch((disconnectError: unknown) => {
        console.error('Failed to close RabbitMQ connection', disconnectError)
        process.exit(1)
      })
  }

  if (!server) {
    closeRabbitMQ()
    return
  }

  server.close((error?: Error): void => {
    if (error) {
      console.error('Failed to close server', error)
      process.exit(1)
    }

    closeRabbitMQ()
  })
}

const bootstrap = async (): Promise<void> => {
  try {
    await connectRabbitMQ()
    console.log('RabbitMQ connected')

    server = app.listen(config.app.port, (): void => {
      console.log(`Server is running on port ${config.app.port}`)
    })
  } catch (error: unknown) {
    console.error('Failed to connect RabbitMQ', error)
    process.exit(1)
  }
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

void bootstrap()
