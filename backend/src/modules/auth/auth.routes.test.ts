import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import request from 'supertest'
import type { AuthenticatedUser } from './auth.types'

const registerMock = jest.fn()
const loginMock = jest.fn()
const refreshMock = jest.fn()
const logoutMock = jest.fn()
const logoutAllMock = jest.fn()
const getAuthenticatedUserMock = jest.fn()

jest.unstable_mockModule('./auth.service', () => ({
  register: registerMock,
  login: loginMock,
  refresh: refreshMock,
  logout: logoutMock,
  logoutAll: logoutAllMock,
  getAuthenticatedUser: getAuthenticatedUserMock
}))

const { app } = await import('../../app')

const user: AuthenticatedUser = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'user@example.com',
  role: 'USER',
  status: 'ACTIVE'
}

const serviceUser = {
  ...user,
  passwordHash: 'hashed-password',
  fullName: null,
  avatarUrl: null,
  createdAt: new Date(),
  updatedAt: new Date()
}

beforeEach(() => {
  jest.resetAllMocks()
  registerMock.mockResolvedValue({
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    refreshExpiresAt: new Date(Date.now() + 60_000),
    user: serviceUser
  })
  loginMock.mockResolvedValue({
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    refreshExpiresAt: new Date(Date.now() + 60_000),
    user: serviceUser
  })
  refreshMock.mockResolvedValue({
    accessToken: 'new-access-token'
  })
  logoutMock.mockResolvedValue(undefined)
  logoutAllMock.mockResolvedValue(undefined)
  getAuthenticatedUserMock.mockResolvedValue(user)
})

describe('auth routes', () => {
  it('normalizes email, returns auth data, and sets the refresh cookie on register', async () => {
    const response = await request(app).post('/api/v1/auth/register').send({
      email: '  User@Example.COM ',
      password: 'Password1'
    })

    expect(response.status).toBe(201)
    expect(registerMock).toHaveBeenCalledWith(
      {
        email: 'user@example.com',
        password: 'Password1'
      },
      expect.any(Object)
    )
    expect(response.body).toMatchObject({
      success: true,
      data: {
        accessToken: 'access-token',
        user
      }
    })
    expect(response.headers['set-cookie'][0]).toContain('refreshToken=refresh-token')
    expect(response.headers['set-cookie'][0]).toContain('HttpOnly')
    expect(response.headers['set-cookie'][0]).toContain('SameSite=Lax')
  })

  it('returns validation errors for invalid register and login payloads', async () => {
    const registerResponse = await request(app).post('/api/v1/auth/register').send({
      email: 'not-an-email',
      password: 'short'
    })
    const loginResponse = await request(app).post('/api/v1/auth/login').send({
      email: 'not-an-email',
      password: ''
    })

    expect(registerResponse.status).toBe(400)
    expect(loginResponse.status).toBe(400)
    expect(registerResponse.body.error.code).toBe('VALIDATION_ERROR')
    expect(loginResponse.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('sets the refresh cookie on login', async () => {
    const response = await request(app).post('/api/v1/auth/login').send({
      email: ' User@Example.COM ',
      password: 'Password1'
    })

    expect(response.status).toBe(200)
    expect(loginMock).toHaveBeenCalledWith(
      {
        email: 'user@example.com',
        password: 'Password1'
      },
      expect.any(Object)
    )
    expect(response.headers['set-cookie'][0]).toContain('refreshToken=refresh-token')
  })

  it('returns only a new access token and does not rotate the refresh cookie', async () => {
    const response = await request(app).post('/api/v1/auth/refresh').set('Cookie', ['refreshToken=refresh-token'])

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      success: true,
      data: {
        accessToken: 'new-access-token'
      }
    })
    expect(response.headers['set-cookie']).toBeUndefined()
  })

  it('clears the refresh cookie on logout', async () => {
    const response = await request(app).post('/api/v1/auth/logout').set('Cookie', ['refreshToken=refresh-token'])

    expect(response.status).toBe(200)
    expect(logoutMock).toHaveBeenCalledWith('refresh-token')
    expect(response.headers['set-cookie'][0]).toContain('refreshToken=')
  })

  it('requires access auth for logout-all and me', async () => {
    const logoutAllResponse = await request(app).post('/api/v1/auth/logout-all')
    const meResponse = await request(app).get('/api/v1/auth/me')

    expect(logoutAllResponse.status).toBe(401)
    expect(meResponse.status).toBe(401)
  })

  it('returns the authenticated user and logs out all sessions', async () => {
    const meResponse = await request(app).get('/api/v1/auth/me').set('Authorization', 'Bearer access-token')
    const logoutAllResponse = await request(app)
      .post('/api/v1/auth/logout-all')
      .set('Authorization', 'Bearer access-token')

    expect(meResponse.status).toBe(200)
    expect(meResponse.body.data.user).toEqual(user)
    expect(logoutAllResponse.status).toBe(200)
    expect(logoutAllMock).toHaveBeenCalledWith(user.id)
    expect(logoutAllResponse.headers['set-cookie'][0]).toContain('refreshToken=')
  })
})
