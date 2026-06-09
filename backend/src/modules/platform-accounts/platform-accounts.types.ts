import type {
  Platform,
  PlatformAccount,
  PlatformAccountStatus,
  PlatformOAuthState
} from '../../infrastructure/db/generated/prisma/client'
import type { PlatformOAuthCallbackQuery, PlatformRoute } from './platform-accounts.schema'

export interface PlatformAccountData {
  id: string
  platform: Platform
  accountName: string | null
  platformUserId: string | null
  status: PlatformAccountStatus
  expiresAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface CreatePlatformConnectionResult {
  authUrl: string
}

export interface HandlePlatformCallbackInput {
  platform: PlatformRoute
  query: PlatformOAuthCallbackQuery
}

export interface HandlePlatformCallbackResult {
  redirectUrl: string
}

export interface YouTubeConnectionTokens {
  accessToken: string
  refreshToken: string | null
  expiresAt: Date | null
}

export interface YouTubeChannelProfile {
  accountName: string
  platformUserId: string
}

export interface CreatePlatformOAuthStateInput {
  userId: string
  platform: Platform
  stateHash: string
  expiresAt: Date
}

export interface UpsertConnectedPlatformAccountInput {
  userId: string
  platform: Platform
  accountName: string
  platformUserId: string
  accessTokenEncrypted: string
  refreshTokenEncrypted: string | null
  tokenLast4: string | null
  expiresAt: Date | null
}

export type PlatformAccountRecord = PlatformAccount
export type PlatformOAuthStateRecord = PlatformOAuthState
