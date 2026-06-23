import { PlatformAccountData, PlatformAccountRecord } from './platform-accounts.types'

export const toPlatformAccountData = (account: PlatformAccountRecord): PlatformAccountData => ({
  id: account.id,
  workspaceId: account.workspaceId,
  platform: account.platform,
  accountName: account.accountName,
  platformUserId: account.platformUserId,
  status: account.status,
  expiresAt: account.expiresAt,
  createdAt: account.createdAt,
  updatedAt: account.updatedAt
})
