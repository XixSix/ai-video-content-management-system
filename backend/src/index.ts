import { app } from './app.js'
import { settings } from './config/index.js'

const server = app.listen(settings.app.port, (): void => {
  console.log(`Server is running on port ${settings.app.port}`)
})

const shutdown = (signal: NodeJS.Signals): void => {
  console.log(`${signal} received. Shutting down gracefully.`)

  server.close((error?: Error): void => {
    if (error) {
      console.error('Failed to close server', error)
      process.exit(1)
    }

    process.exit(0)
  })
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
