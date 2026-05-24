import cookieParser from 'cookie-parser'
import express, { type Express } from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import swaggerUi from 'swagger-ui-express'
import { config } from './config/index'
import { swaggerSpec } from './config/swagger'
import { globalErrorHandler, notFoundHandler } from './middleware/error-handler'
import { apiRouter } from './modules/index'

export const createApp = (): Express => {
  const app = express()

  app.use(helmet())
  app.use(express.json({ limit: '10mb' }))
  app.use(express.urlencoded({ extended: true }))
  app.use(cookieParser())

  if (!config.app.isTest) {
    app.use(morgan(config.app.isProduction ? 'combined' : 'dev'))
  }

  // Swagger documentation
  app.get('/api-docs.json', (_req, res) => {
    res.type('application/json').send(swaggerSpec)
  })
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

  app.use('/api/v1', apiRouter)

  app.use(notFoundHandler)
  app.use(globalErrorHandler)

  return app
}

export const app = createApp()
