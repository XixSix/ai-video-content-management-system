import * as platformAccountsRepo from './platform-accounts.repository'
import { config } from '../../config'
import * as youtubeOauth from '../../infrastructure/google/youtube-oauth'
import {
  buildPlatformOauthRedirectUrl,
  decryptToken,
  encryptToken,
  generateOAuthState,
  getTokenLast4,
  hashOAuthState,
  isExpired,
  resolvePlatform
} from './platform-accounts.util'
import { PlatformAccountsError } from './platform-accounts.error'
import type {
  CreatePlatformConnectionResult,
  HandlePlatformCallbackInput,
  HandlePlatformCallbackResult,
  PlatformAccountData
} from './platform-accounts.types'
import type { PlatformRoute } from './platform-accounts.schema'
import { toPlatformAccountData } from './platform-accounts.mapper'

export const buildCallbackFailureRedirectUrl = (platform: PlatformRoute, code: string): string =>
  buildPlatformOauthRedirectUrl(platform, 'failed', code)

export const listPlatformAccounts = async (userId: string): Promise<PlatformAccountData[]> => {
  const accounts = await platformAccountsRepo.findPlatformAccountsByUserId(userId)
  return accounts.map(toPlatformAccountData)
}

export const createPlatformConnection = async (
  userId: string,
  platformRoute: PlatformRoute
): Promise<CreatePlatformConnectionResult> => {
  const platform = resolvePlatform(platformRoute)
  const state = generateOAuthState()
  const expiresAt = new Date(Date.now() + config.platform.oauthStateTtlMs)

  await platformAccountsRepo.createPlatformOAuthState({
    userId,
    platform,
    stateHash: hashOAuthState(state),
    expiresAt
  })

  return {
    authUrl: youtubeOauth.createYouTubeAuthUrl(state)
  }
}

export const handlePlatformCallback = async (
  input: HandlePlatformCallbackInput
): Promise<HandlePlatformCallbackResult> => {
  const platform = resolvePlatform(input.platform)
  const { code, error, error_description: errorDescription, state } = input.query

  if (error) {
    throw PlatformAccountsError.authorizationDenied(errorDescription ?? error)
  }

  if (!code || !state) {
    throw PlatformAccountsError.invalidCallback('Missing OAuth code or state')
  }

  const oauthState = await platformAccountsRepo.findPlatformOAuthStateByHashAndPlatform(hashOAuthState(state), platform)

  if (!oauthState) {
    throw PlatformAccountsError.invalidState()
  }

  if (oauthState.consumedAt) {
    throw PlatformAccountsError.consumedState()
  }

  if (isExpired(oauthState.expiresAt)) {
    throw PlatformAccountsError.expiredState()
  }

  await platformAccountsRepo.consumePlatformOAuthState(oauthState.id, new Date())

  let tokens

  try {
    tokens = await youtubeOauth.exchangeYouTubeCode(code)
  } catch (error: unknown) {
    throw PlatformAccountsError.tokenExchangeFailed(error instanceof Error ? error.message : undefined)
  }

  let channel

  try {
    channel = await youtubeOauth.getAuthenticatedYouTubeChannel(tokens)
  } catch (error: unknown) {
    throw PlatformAccountsError.channelFetchFailed(error instanceof Error ? error.message : undefined)
  }

  const existingAccount = await platformAccountsRepo.findPlatformAccountByUserIdAndPlatform(oauthState.userId, platform)
  const refreshTokenEncrypted = tokens.refreshToken
    ? encryptToken(tokens.refreshToken)
    : (existingAccount?.refreshTokenEncrypted ?? null)
  const tokenLast4 = tokens.refreshToken ? getTokenLast4(tokens.refreshToken) : (existingAccount?.tokenLast4 ?? null)

  await platformAccountsRepo.upsertConnectedPlatformAccount({
    userId: oauthState.userId,
    platform,
    accountName: channel.accountName,
    platformUserId: channel.platformUserId,
    accessTokenEncrypted: encryptToken(tokens.accessToken),
    refreshTokenEncrypted,
    tokenLast4,
    expiresAt: tokens.expiresAt
  })

  return {
    redirectUrl: buildPlatformOauthRedirectUrl(input.platform, 'connected')
  }
}

export const disconnectPlatformAccount = async (userId: string, platformRoute: PlatformRoute): Promise<void> => {
  const platform = resolvePlatform(platformRoute)
  const account = await platformAccountsRepo.findPlatformAccountByUserIdAndPlatform(userId, platform)

  if (!account || account.status === 'REVOKED') {
    return
  }

  const revocationSource = account.refreshTokenEncrypted ?? account.accessTokenEncrypted

  if (revocationSource) {
    try {
      await youtubeOauth.revokeYouTubeToken(decryptToken(revocationSource))
    } catch {
      // Best-effort token revocation should not block local disconnect.
    }
  }

  await platformAccountsRepo.revokePlatformAccount(account.id)
}
