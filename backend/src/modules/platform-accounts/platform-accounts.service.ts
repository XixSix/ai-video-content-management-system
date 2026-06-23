import * as platformAccountsRepo from './platform-accounts.repository'
import { config } from '../../config'
import * as facebookOauth from '../../infrastructure/facebook/facebook-oauth'
import * as youtubeOauth from '../../infrastructure/google/youtube-oauth'
import { Platform, PlatformAccountStatus, type PlatformAccount } from '../../infrastructure/db/generated/prisma/client'
import * as workspaceService from '../workspace/workspace.service'
import { WorkspaceError } from '../workspace/workspace.error'
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
  FacebookConnectionTokens,
  FacebookPageProfile,
  HandlePlatformCallbackInput,
  HandlePlatformCallbackResult,
  PlatformAccountData,
  YouTubeChannelProfile,
  YouTubeConnectionTokens
} from './platform-accounts.types'
import type { PlatformRoute } from './platform-accounts.schema'
import { toPlatformAccountData } from './platform-accounts.mapper'

type PlatformConnectionTokens = YouTubeConnectionTokens | FacebookConnectionTokens
type ConnectedPlatformProfile = YouTubeChannelProfile | FacebookPageProfile

interface ConnectedPlatformAccount {
  tokens: PlatformConnectionTokens
  profile: ConnectedPlatformProfile
}

const TOKEN_REFRESH_WINDOW_MS = 5 * 60 * 1000

export const buildCallbackFailureRedirectUrl = (platform: PlatformRoute, code: string): string =>
  buildPlatformOauthRedirectUrl(platform, 'failed', code)

const createPlatformAuthUrl = (platform: Platform, state: string): string => {
  if (platform === Platform.YOUTUBE) {
    return youtubeOauth.createYouTubeAuthUrl(state)
  }

  if (platform === Platform.FACEBOOK) {
    return facebookOauth.createFacebookAuthUrl(state)
  }

  throw PlatformAccountsError.unsupportedPlatform()
}

const connectAuthenticatedPlatformAccount = async (
  platform: Platform,
  code: string
): Promise<ConnectedPlatformAccount> => {
  if (platform === Platform.YOUTUBE) {
    let tokens: YouTubeConnectionTokens

    try {
      tokens = await youtubeOauth.exchangeYouTubeCode(code)
    } catch (error: unknown) {
      throw PlatformAccountsError.tokenExchangeFailed(error instanceof Error ? error.message : undefined)
    }

    try {
      const profile = await youtubeOauth.getAuthenticatedYouTubeChannel(tokens)

      return { tokens, profile }
    } catch (error: unknown) {
      throw PlatformAccountsError.channelFetchFailed(error instanceof Error ? error.message : undefined)
    }
  }

  if (platform === Platform.FACEBOOK) {
    let userTokens: FacebookConnectionTokens

    try {
      userTokens = await facebookOauth.exchangeFacebookCode(code)
    } catch (error: unknown) {
      throw PlatformAccountsError.tokenExchangeFailed(error instanceof Error ? error.message : undefined)
    }

    try {
      const profile = await facebookOauth.getAuthenticatedFacebookPage(userTokens)

      return {
        tokens: {
          accessToken: profile.pageAccessToken,
          refreshToken: userTokens.accessToken,
          expiresAt: userTokens.expiresAt
        },
        profile
      }
    } catch (error: unknown) {
      throw PlatformAccountsError.accountFetchFailed(error instanceof Error ? error.message : undefined)
    }
  }

  throw PlatformAccountsError.unsupportedPlatform()
}

const revokePlatformToken = async (platform: Platform, token: string): Promise<void> => {
  if (platform === Platform.YOUTUBE) {
    await youtubeOauth.revokeYouTubeToken(token)
    return
  }

  if (platform === Platform.FACEBOOK) {
    await facebookOauth.revokeFacebookToken(token)
    return
  }

  throw PlatformAccountsError.unsupportedPlatform()
}

export const listPlatformAccounts = async (workspaceId: string): Promise<PlatformAccountData[]> => {
  await platformAccountsRepo.expireElapsedPlatformAccounts(workspaceId, new Date())
  const accounts = await platformAccountsRepo.findPlatformAccountsByWorkspaceId(workspaceId)
  return accounts.map(toPlatformAccountData)
}

export const createPlatformConnection = async (
  workspaceId: string,
  userId: string,
  platformRoute: PlatformRoute
): Promise<CreatePlatformConnectionResult> => {
  const platform = resolvePlatform(platformRoute)
  const state = generateOAuthState()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + config.platform.oauthStateTtlMs)

  await platformAccountsRepo.deleteStalePlatformOAuthStates(workspaceId, platform, now)
  await platformAccountsRepo.createPlatformOAuthState({
    workspaceId,
    initiatedByUserId: userId,
    platform,
    stateHash: hashOAuthState(state),
    expiresAt
  })

  return {
    authUrl: createPlatformAuthUrl(platform, state)
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

  const claimed = await platformAccountsRepo.claimPlatformOAuthState(oauthState.id, new Date())

  if (!claimed) {
    throw PlatformAccountsError.consumedState()
  }

  const membership = await workspaceService.getWorkspaceMembershipContext(
    oauthState.workspaceId,
    oauthState.initiatedByUserId
  )

  if (membership.role !== 'OWNER') {
    throw WorkspaceError.ownerRequired()
  }

  const connectedAccount = await connectAuthenticatedPlatformAccount(platform, code)
  const existingAccount = await platformAccountsRepo.findPlatformAccountByWorkspaceIdAndPlatform(
    oauthState.workspaceId,
    platform
  )
  const { tokens, profile } = connectedAccount
  const refreshTokenEncrypted = tokens.refreshToken
    ? encryptToken(tokens.refreshToken)
    : (existingAccount?.refreshTokenEncrypted ?? null)
  const tokenLast4 = tokens.refreshToken ? getTokenLast4(tokens.refreshToken) : (existingAccount?.tokenLast4 ?? null)

  await platformAccountsRepo.upsertConnectedPlatformAccount({
    workspaceId: oauthState.workspaceId,
    connectedByUserId: oauthState.initiatedByUserId,
    platform,
    accountName: profile.accountName,
    platformUserId: profile.platformUserId,
    avatarUrl: profile.avatarUrl,
    accessTokenEncrypted: encryptToken(tokens.accessToken),
    refreshTokenEncrypted,
    tokenLast4,
    expiresAt: tokens.expiresAt
  })

  return {
    redirectUrl: buildPlatformOauthRedirectUrl(input.platform, 'connected')
  }
}

export const disconnectPlatformAccount = async (workspaceId: string, platformRoute: PlatformRoute): Promise<void> => {
  const platform = resolvePlatform(platformRoute)
  const account = await platformAccountsRepo.findPlatformAccountByWorkspaceIdAndPlatform(workspaceId, platform)

  if (!account || account.status === 'REVOKED') {
    return
  }

  const revocationSource = account.refreshTokenEncrypted ?? account.accessTokenEncrypted

  if (revocationSource) {
    try {
      await revokePlatformToken(platform, decryptToken(revocationSource))
    } catch {
      // Best-effort token revocation should not block local disconnect.
    }
  }

  await platformAccountsRepo.revokePlatformAccount(account.id)
}

const refreshYouTubeAccount = async (account: PlatformAccount): Promise<PlatformAccount> => {
  if (!account.refreshTokenEncrypted) {
    await platformAccountsRepo.expirePlatformAccount(account.id)
    throw PlatformAccountsError.invalidAccount('YouTube account must be reconnected')
  }

  let tokens: YouTubeConnectionTokens

  try {
    tokens = await youtubeOauth.refreshYouTubeAccessToken(decryptToken(account.refreshTokenEncrypted))
  } catch (error: unknown) {
    if (error instanceof youtubeOauth.InvalidYouTubeRefreshTokenError) {
      await platformAccountsRepo.expirePlatformAccount(account.id)
      throw PlatformAccountsError.invalidAccount('YouTube authorization has expired; reconnect the account')
    }

    throw PlatformAccountsError.providerUnavailable(error instanceof Error ? error.message : undefined)
  }

  const refreshToken = tokens.refreshToken ?? decryptToken(account.refreshTokenEncrypted)

  return platformAccountsRepo.updatePlatformAccountCredentials(account.id, {
    accessTokenEncrypted: encryptToken(tokens.accessToken),
    refreshTokenEncrypted: encryptToken(refreshToken),
    tokenLast4: getTokenLast4(refreshToken),
    expiresAt: tokens.expiresAt
  })
}

export const getUsablePlatformAccount = async (
  workspaceId: string,
  platform: Platform,
  platformAccountId: string
): Promise<PlatformAccount> => {
  const account = await platformAccountsRepo.findPlatformAccountById(platformAccountId)

  if (!account) {
    throw PlatformAccountsError.accountNotFound()
  }

  if (account.workspaceId !== workspaceId) {
    throw PlatformAccountsError.accountForbidden()
  }

  if (account.platform !== platform || account.status === PlatformAccountStatus.REVOKED) {
    throw PlatformAccountsError.invalidAccount()
  }

  const expiresSoon = account.expiresAt ? account.expiresAt.getTime() <= Date.now() + TOKEN_REFRESH_WINDOW_MS : false

  if (platform === Platform.YOUTUBE && (account.status === PlatformAccountStatus.EXPIRED || expiresSoon)) {
    return refreshYouTubeAccount(account)
  }

  if (account.status !== PlatformAccountStatus.CONNECTED || expiresSoon) {
    if (account.status !== PlatformAccountStatus.EXPIRED) {
      await platformAccountsRepo.expirePlatformAccount(account.id)
    }

    throw PlatformAccountsError.invalidAccount(`${platform} account must be reconnected`)
  }

  return account
}
