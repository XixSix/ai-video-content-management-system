import type { SocialPlatform } from "../social-accounts.types"

type PlatformIconProps = {
  platform: SocialPlatform
  className?: string
  size?: number
}

function YouTubeIcon({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <path
        d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814Z"
        fill="#FF0000"
      />
      <path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568Z" fill="#fff" />
    </svg>
  )
}

function FacebookIcon({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <circle cx="12" cy="12" r="12" fill="#1877F2" />
      <path
        d="M16.671 15.469 17.203 12h-3.328V9.749c0-.949.464-1.874 1.955-1.874h1.513V5.128S15.958 4.875 14.62 4.875c-2.79 0-4.61 1.69-4.61 4.751V12H7.078v3.469H10.01V24h3.865v-8.531h2.796Z"
        fill="#fff"
      />
    </svg>
  )
}

export function PlatformIcon({ platform, className, size = 24 }: PlatformIconProps) {
  const icons: Record<SocialPlatform, React.ReactNode> = {
    youtube: <YouTubeIcon size={size} />,
    facebook: <FacebookIcon size={size} />,
  }

  return (
    <span className={className} aria-hidden>
      {icons[platform]}
    </span>
  )
}
