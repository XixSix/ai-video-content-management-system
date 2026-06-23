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

export const deleteStalePlatformOAuthStates = async (
  workspaceId: string,
  platform: Platform,
  now: Date
): Promise<number> => {
  const result = await prisma.platformOAuthState.deleteMany({
    where: {
      workspaceId,
      platform,
      OR: [{ consumedAt: { not: null } }, { expiresAt: { lte: now } }]
    }
  })

  return result.count
}

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

export const claimPlatformOAuthState = async (id: string, consumedAt: Date): Promise<boolean> => {
  const result = await prisma.platformOAuthState.updateMany({
    where: {
      id,
      consumedAt: null,
      expiresAt: { gt: consumedAt }
    },
    data: { consumedAt }
  })

  return result.count === 1
}

export const expireElapsedPlatformAccounts = async (workspaceId: string, now: Date): Promise<number> => {
  const result = await prisma.platformAccount.updateMany({
    where: {
      workspaceId,
      status: PlatformAccountStatus.CONNECTED,
      expiresAt: { lte: now }
    },
    data: {
      status: PlatformAccountStatus.EXPIRED
    }
  })

  return result.count
}

export const findPlatformAccountsByWorkspaceId = async (workspaceId: string): Promise<PlatformAccount[]> =>
  prisma.platformAccount.findMany({
    where: {
      workspaceId,
      status: {
        not: PlatformAccountStatus.REVOKED
      }
    },
    orderBy: {
      createdAt: 'asc'
    }
  })

export const findPlatformAccountByWorkspaceIdAndPlatform = async (
  workspaceId: string,
  platform: Platform
): Promise<PlatformAccount | null> =>
  prisma.platformAccount.findUnique({
    where: {
      workspaceId_platform: {
        workspaceId,
        platform
      }
    }
  })

export const findPlatformAccountById = async (id: string): Promise<PlatformAccount | null> =>
  prisma.platformAccount.findUnique({
    where: { id }
  })

export const upsertConnectedPlatformAccount = async (
  data: UpsertConnectedPlatformAccountInput
): Promise<PlatformAccount> =>
  prisma.platformAccount.upsert({
    where: {
      workspaceId_platform: {
        workspaceId: data.workspaceId,
        platform: data.platform
      }
    },
    create: {
      workspaceId: data.workspaceId,
      connectedByUserId: data.connectedByUserId,
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
      connectedByUserId: data.connectedByUserId,
      accountName: data.accountName,
      platformUserId: data.platformUserId,
      accessTokenEncrypted: data.accessTokenEncrypted,
      refreshTokenEncrypted: data.refreshTokenEncrypted,
      tokenLast4: data.tokenLast4,
      expiresAt: data.expiresAt,
      status: PlatformAccountStatus.CONNECTED
    }
  })

export const updatePlatformAccountCredentials = async (
  id: string,
  data: {
    accessTokenEncrypted: string
    refreshTokenEncrypted: string | null
    tokenLast4: string | null
    expiresAt: Date | null
  }
): Promise<PlatformAccount> =>
  prisma.platformAccount.update({
    where: { id },
    data: {
      ...data,
      status: PlatformAccountStatus.CONNECTED
    }
  })

export const expirePlatformAccount = async (id: string): Promise<PlatformAccount> =>
  prisma.platformAccount.update({
    where: { id },
    data: {
      status: PlatformAccountStatus.EXPIRED
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
