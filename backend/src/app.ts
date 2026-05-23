import express, { type Express } from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import { settings } from './config/index.js'
import { globalErrorHandler, notFoundHandler } from './middleware/error-handler.js'
import { apiRouter } from './routes/index.js'

export const createApp = (): Express => {
  const app = express()

  app.use(helmet())
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true }))

  if (!settings.app.isTest) {
    app.use(morgan(settings.app.isProduction ? 'combined' : 'dev'))
  }

  app.use('/api', apiRouter)

  app.use(notFoundHandler)
  app.use(globalErrorHandler)

  return app
}

export const app = createApp()
