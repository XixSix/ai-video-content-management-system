import type { ParamsQueryRequestHandler, ParamsRequestHandler } from '../../types/express'
import { sendSuccess } from '../../utils/response'
import { PlatformAccountsError } from './platform-accounts.error'
import type { PlatformOAuthCallbackQuery, PlatformParams } from './platform-accounts.schema'
import * as platformAccountsService from './platform-accounts.service'
import type { CreatePlatformConnectionResult, PlatformAccountData } from './platform-accounts.types'

export const list: ParamsRequestHandler<Record<string, never>> = async (req, res, next): Promise<void> => {
  try {
    const accounts = await platformAccountsService.listPlatformAccounts(req.user!.id)
    sendSuccess<{ accounts: PlatformAccountData[] }>(res, { accounts })
  } catch (error: unknown) {
    next(error)
  }
}

export const connect: ParamsRequestHandler<PlatformParams> = async (req, res, next): Promise<void> => {
  try {
    const result: CreatePlatformConnectionResult = await platformAccountsService.createPlatformConnection(
      req.user!.id,
      req.params.platform
    )

    sendSuccess<CreatePlatformConnectionResult>(res, result)
  } catch (error: unknown) {
    next(error)
  }
}

export const callback: ParamsQueryRequestHandler<PlatformParams, PlatformOAuthCallbackQuery> = async (
  req,
  res
): Promise<void> => {
  const query = req.query as PlatformOAuthCallbackQuery

  try {
    const result = await platformAccountsService.handlePlatformCallback({
      platform: req.params.platform,
      query: {
        code: query.code,
        state: query.state,
        error: query.error,
        error_description: query.error_description
      }
    })

    res.redirect(302, result.redirectUrl)
  } catch (error: unknown) {
    const code = error instanceof PlatformAccountsError ? error.code : 'PLATFORM_OAUTH_CALLBACK_FAILED'
    res.redirect(302, platformAccountsService.buildCallbackFailureRedirectUrl(req.params.platform, code))
  }
}

export const disconnect: ParamsRequestHandler<PlatformParams> = async (req, res, next): Promise<void> => {
  try {
    await platformAccountsService.disconnectPlatformAccount(req.user!.id, req.params.platform)

    sendSuccess<{ message: string }>(res, {
      message: 'Platform account disconnected successfully'
    })
  } catch (error: unknown) {
    next(error)
  }
}
