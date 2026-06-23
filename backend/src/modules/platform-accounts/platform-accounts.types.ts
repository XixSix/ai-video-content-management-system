import type {
  Platform,
  PlatformAccount,
  PlatformAccountStatus,
  PlatformOAuthState
} from '../../infrastructure/db/generated/prisma/client'
import type { PlatformOAuthCallbackQuery, PlatformRoute } from './platform-accounts.schema'

export interface PlatformAccountData {
  id: string
  workspaceId: string
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

export interface FacebookConnectionTokens {
  accessToken: string
  refreshToken: string | null
  expiresAt: Date | null
}

export interface FacebookPageProfile {
  accountName: string
  platformUserId: string
  pageAccessToken: string
}

export interface CreatePlatformOAuthStateInput {
  workspaceId: string
  initiatedByUserId: string
  platform: Platform
  stateHash: string
  expiresAt: Date
}

export interface UpsertConnectedPlatformAccountInput {
  workspaceId: string
  connectedByUserId: string
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
