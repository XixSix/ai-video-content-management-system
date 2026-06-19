import * as authService from './auth.service'

import { clearRefreshCookie, setRefreshCookie } from './auth.cookies'
import type { AccessTokenResponseData, AuthResponseData, MessageResponseData } from './auth.types'
import type { AppRequestHandler, BodyRequestHandler } from '../../types/express'
import { getOptionalRefreshTokenFromCookie, getRefreshTokenFromCookie, getRequestMetadata } from './auth.request'
import { toAuthenticatedUser } from './auth.mapper'
import type { LoginBody, RegisterBody } from './auth.schema'
import { sendSuccess } from '../../utils/response'

export const register: BodyRequestHandler<RegisterBody> = async (req, res, next): Promise<void> => {
  try {
    const result = await authService.register(req.body, getRequestMetadata(req))

    setRefreshCookie(res, result.refreshToken)

    sendSuccess<AuthResponseData>(
      res,
      {
        accessToken: result.accessToken,
        user: toAuthenticatedUser(result.user)
      },
      201
    )
  } catch (error: unknown) {
    next(error)
  }
}

export const login: BodyRequestHandler<LoginBody> = async (req, res, next): Promise<void> => {
  try {
    const result = await authService.login(req.body, getRequestMetadata(req))
    setRefreshCookie(res, result.refreshToken)
    sendSuccess<AuthResponseData>(res, {
      accessToken: result.accessToken,
      user: toAuthenticatedUser(result.user)
    })
  } catch (error: unknown) {
    next(error)
  }
}

export const refresh: AppRequestHandler = async (req, res, next): Promise<void> => {
  try {
    const refreshToken = getRefreshTokenFromCookie(req)
    const result = await authService.refresh(refreshToken, getRequestMetadata(req))
    sendSuccess<AccessTokenResponseData>(res, {
      accessToken: result.accessToken
    })
  } catch (error: unknown) {
    next(error)
  }
}

export const logout: AppRequestHandler = async (req, res, next): Promise<void> => {
  try {
    await authService.logout(getOptionalRefreshTokenFromCookie(req))
    clearRefreshCookie(res)
    sendSuccess<MessageResponseData>(res, {
      message: 'Logged out'
    })
  } catch (error: unknown) {
    next(error)
  }
}

export const logoutAll: AppRequestHandler = async (req, res, next): Promise<void> => {
  try {
    await authService.logoutAll(req.user!.id)
    clearRefreshCookie(res)
    sendSuccess<MessageResponseData>(res, {
      message: 'Logged out from all sessions'
    })
  } catch (error: unknown) {
    next(error)
  }
}

export const me: AppRequestHandler = (req, res, next): void => {
  try {
    sendSuccess(res, {
      user: req.user!
    })
  } catch (error: unknown) {
    next(error)
  }
}
