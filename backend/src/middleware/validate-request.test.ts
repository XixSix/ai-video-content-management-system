import { describe, expect, it } from '@jest/globals'
import express from 'express'
import request from 'supertest'
import { z } from 'zod'
import { globalErrorHandler } from './error-handler'
import { validateRequest } from './validate-request'

describe('validateRequest', () => {
  it('passes parsed request body to the next handler', async () => {
    const app = express()

    app.use(express.json())
    app.post(
      '/users',
      validateRequest({
        body: z.object({
          age: z.coerce.number().int().positive()
        })
      }),
      (req, res) => {
        res.status(200).json({ age: req.body.age })
      }
    )
    app.use(globalErrorHandler)

    const response = await request(app).post('/users').send({ age: '25' })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ age: 25 })
  })

  it('passes parsed query params to the next handler', async () => {
    const app = express()

    app.get(
      '/users',
      validateRequest({
        query: z.object({
          page: z.coerce.number().int().positive()
        })
      }),
      (req, res) => {
        res.status(200).json({ page: req.query.page })
      }
    )
    app.use(globalErrorHandler)

    const response = await request(app).get('/users?page=2')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ page: 2 })
  })

  it('returns validation errors when a request part is invalid', async () => {
    const app = express()

    app.use(express.json())
    app.post(
      '/users',
      validateRequest({
        body: z.object({
          email: z.email()
        })
      }),
      (_req, res) => {
        res.status(204).end()
      }
    )
    app.use(globalErrorHandler)

    const response = await request(app).post('/users').send({ email: 'invalid' })

    expect(response.status).toBe(400)
    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed'
      }
    })
    expect(response.body.error.details).toEqual([
      expect.objectContaining({
        path: 'email'
      })
    ])
  })
})
