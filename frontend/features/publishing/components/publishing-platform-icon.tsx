import { PlatformIcon } from "@/features/social-accounts/components/platform-icon"
import type { SocialPlatform } from "@/features/social-accounts/social-accounts.types"
import type { PublishPlatform } from "../publishing.types"

const socialPlatformMap: Record<PublishPlatform, SocialPlatform> = {
  YOUTUBE: "youtube",
  FACEBOOK: "facebook",
}

type PublishingPlatformIconProps = {
  platform: PublishPlatform
  size?: number
  className?: string
}

export function PublishingPlatformIcon({
  platform,
  size = 18,
  className,
}: PublishingPlatformIconProps) {
  return (
    <PlatformIcon
      platform={socialPlatformMap[platform]}
      size={size}
      className={className}
    />
  )
}
