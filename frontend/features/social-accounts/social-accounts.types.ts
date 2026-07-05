export type SocialPlatform = "youtube" | "facebook"

export type BackendPlatform = "YOUTUBE" | "FACEBOOK"
export type PlatformAccountStatus = "CONNECTED" | "EXPIRED" | "REVOKED"

export type PlatformAccountData = {
  id: string
  workspaceId: string
  platform: BackendPlatform
  accountName: string | null
  platformUserId: string | null
  avatarUrl: string | null
  status: PlatformAccountStatus
  expiresAt: string | null
  createdAt: string
  updatedAt: string
}

export type PlatformInfo = {
  id: SocialPlatform
  name: string
  description: string
  color: string
  badgeLabel?: string
  mockAccountName: string
  backendSupported: boolean
  backendId?: BackendPlatform
}

export type PlatformFilterValue = "all" | SocialPlatform
