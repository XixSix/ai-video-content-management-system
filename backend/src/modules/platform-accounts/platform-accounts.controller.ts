import type { ParamsRequestHandler } from '../../types/express'
import { sendSuccess } from '../../utils/response'
import { AppError } from '../../utils/app-error'
import { PlatformAccountsError } from './platform-accounts.error'
import {
  platformOAuthCallbackQuerySchema,
  type PlatformParams,
  type WorkspacePlatformParams
} from './platform-accounts.schema'
import * as platformAccountsService from './platform-accounts.service'
import type { CreatePlatformConnectionResult, PlatformAccountData } from './platform-accounts.types'

export const list: ParamsRequestHandler<{ workspaceId: string }> = async (req, res, next): Promise<void> => {
  try {
    const accounts = await platformAccountsService.listPlatformAccounts(req.workspace!.id)
    sendSuccess<{ accounts: PlatformAccountData[] }>(res, { accounts })
  } catch (error: unknown) {
    next(error)
  }
}

export const connect: ParamsRequestHandler<WorkspacePlatformParams> = async (req, res, next): Promise<void> => {
  try {
    const result: CreatePlatformConnectionResult = await platformAccountsService.createPlatformConnection(
      req.workspace!.id,
      req.user!.id,
      req.params.platform
    )

    sendSuccess<CreatePlatformConnectionResult>(res, result)
  } catch (error: unknown) {
    next(error)
  }
}

export const callback: ParamsRequestHandler<PlatformParams> = async (req, res): Promise<void> => {
  try {
    const queryResult = platformOAuthCallbackQuerySchema.safeParse(req.query)

    if (!queryResult.success) {
      throw PlatformAccountsError.invalidCallback()
    }

    const query = queryResult.data
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
    const code = error instanceof AppError ? error.code : 'PLATFORM_OAUTH_CALLBACK_FAILED'
    res.redirect(302, platformAccountsService.buildCallbackFailureRedirectUrl(req.params.platform, code))
  }
}

export const disconnect: ParamsRequestHandler<WorkspacePlatformParams> = async (req, res, next): Promise<void> => {
  try {
    await platformAccountsService.disconnectPlatformAccount(req.workspace!.id, req.params.platform)

    sendSuccess<{ message: string }>(res, {
      message: 'Platform account disconnected successfully'
    })
  } catch (error: unknown) {
    next(error)
  }
}
