export type SocialPlatform =
  | "youtube"
  | "tiktok"
  | "instagram"
  | "facebook"
  | "linkedin"
  | "x"

export type ConnectedAccount = {
  id: string
  platform: SocialPlatform
  displayName: string
  profileUrl: string | null
  avatarUrl: string | null
  connectedAt: string
}

export type PlatformInfo = {
  id: SocialPlatform
  name: string
  description: string
  color: string
  badgeLabel?: string
  mockAccountName: string
}

export type PlatformFilterValue = "all" | SocialPlatform
