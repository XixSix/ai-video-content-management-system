import type { Response } from 'express'
import { config } from '../../config'

export const setRefreshCookie = (res: Response, refreshToken: string): void => {
  res.cookie(config.cookie.refreshName, refreshToken, {
    ...config.cookie.refreshOptions,
    path: config.cookie.refreshPath
  })
}

export const clearRefreshCookie = (res: Response): void => {
  res.clearCookie(config.cookie.refreshName, {
    httpOnly: config.cookie.refreshOptions.httpOnly,
    path: config.cookie.refreshPath,
    sameSite: config.cookie.refreshOptions.sameSite,
    secure: config.cookie.refreshOptions.secure
  })
}
