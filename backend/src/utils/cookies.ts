import type { Response } from 'express'
import { config } from '../config'

export const setRefreshCookie = (res: Response, refreshToken: string): void => {
  res.cookie(config.cookie.refreshName, refreshToken, {
    ...config.cookie.refreshOptions,
    path: config.cookie.refreshPath
  })
}

export const clearRefreshCookie = (res: Response): void => {
  res.clearCookie(config.cookie.refreshName, {
    path: config.cookie.refreshPath
  })
}
