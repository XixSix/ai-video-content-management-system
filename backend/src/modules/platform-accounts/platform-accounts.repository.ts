import {
  PlatformAccountStatus,
  type Platform,
  type PlatformAccount,
  type PlatformOAuthState
} from '../../infrastructure/db/generated/prisma/client'
import { prisma } from '../../infrastructure/db/prisma'
import type { CreatePlatformOAuthStateInput, UpsertConnectedPlatformAccountInput } from './platform-accounts.types'

export const createPlatformOAuthState = async (data: CreatePlatformOAuthStateInput): Promise<PlatformOAuthState> =>
  prisma.platformOAuthState.create({ data })

export const findPlatformOAuthStateByHashAndPlatform = async (
  stateHash: string,
  platform: Platform
): Promise<PlatformOAuthState | null> =>
  prisma.platformOAuthState.findFirst({
    where: {
      stateHash,
      platform
    }
  })

export const consumePlatformOAuthState = async (id: string, consumedAt: Date): Promise<PlatformOAuthState> =>
  prisma.platformOAuthState.update({
    where: { id },
    data: { consumedAt }
  })

export const findPlatformAccountsByUserId = async (userId: string): Promise<PlatformAccount[]> =>
  prisma.platformAccount.findMany({
    where: {
      userId,
      status: {
        not: PlatformAccountStatus.REVOKED
      }
    },
    orderBy: {
      createdAt: 'asc'
    }
  })

export const findPlatformAccountByUserIdAndPlatform = async (
  userId: string,
  platform: Platform
): Promise<PlatformAccount | null> =>
  prisma.platformAccount.findUnique({
    where: {
      userId_platform: {
        userId,
        platform
      }
    }
  })

export const upsertConnectedPlatformAccount = async (
  data: UpsertConnectedPlatformAccountInput
): Promise<PlatformAccount> =>
  prisma.platformAccount.upsert({
    where: {
      userId_platform: {
        userId: data.userId,
        platform: data.platform
      }
    },
    create: {
      userId: data.userId,
      platform: data.platform,
      accountName: data.accountName,
      platformUserId: data.platformUserId,
      accessTokenEncrypted: data.accessTokenEncrypted,
      refreshTokenEncrypted: data.refreshTokenEncrypted,
      tokenLast4: data.tokenLast4,
      expiresAt: data.expiresAt,
      status: PlatformAccountStatus.CONNECTED
    },
    update: {
      accountName: data.accountName,
      platformUserId: data.platformUserId,
      accessTokenEncrypted: data.accessTokenEncrypted,
      refreshTokenEncrypted: data.refreshTokenEncrypted,
      tokenLast4: data.tokenLast4,
      expiresAt: data.expiresAt,
      status: PlatformAccountStatus.CONNECTED
    }
  })

export const revokePlatformAccount = async (id: string): Promise<PlatformAccount> =>
  prisma.platformAccount.update({
    where: { id },
    data: {
      accessTokenEncrypted: null,
      refreshTokenEncrypted: null,
      tokenLast4: null,
      expiresAt: null,
      status: PlatformAccountStatus.REVOKED
    }
  })
