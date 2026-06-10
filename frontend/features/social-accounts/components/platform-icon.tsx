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

function TikTokIcon({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <path
        d="M19.321 5.562a5.124 5.124 0 0 1-.443-.258 6.228 6.228 0 0 1-1.137-.966c-.849-.971-1.166-1.956-1.282-2.645h.004c-.097-.573-.057-.943-.05-.943h-4.057v14.406c0 .194 0 .384-.009.572 0 .022-.002.043-.003.064-.002.026-.003.051-.006.076v.015a3.28 3.28 0 0 1-1.65 2.609 3.21 3.21 0 0 1-1.612.427c-1.8 0-3.26-1.468-3.26-3.281 0-1.813 1.46-3.282 3.26-3.282.34 0 .668.052.977.15v-4.135a7.363 7.363 0 0 0-.977-.066c-4.088 0-7.432 3.246-7.573 7.31-.076 2.218.772 4.3 2.383 5.861A7.485 7.485 0 0 0 9.076 24c4.135 0 7.503-3.383 7.503-7.536V9.114a10.08 10.08 0 0 0 5.92 1.91V6.966a6.31 6.31 0 0 1-3.178-1.404Z"
        fill="currentColor"
      />
    </svg>
  )
}

function LinkedInIcon({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <rect width="24" height="24" rx="4" fill="#0A66C2" />
      <path
        d="M7.077 9.554H4.108v10.291h2.97V9.554ZM5.593 8.29c.95 0 1.718-.776 1.718-1.733S6.543 4.826 5.593 4.826c-.952 0-1.72.775-1.72 1.731 0 .957.768 1.733 1.72 1.733ZM19.879 19.845h-2.966v-5.008c0-1.194-.024-2.729-1.66-2.729-1.662 0-1.916 1.3-1.916 2.643v5.094H10.37V9.554h2.849v1.404h.04c.397-.752 1.366-1.544 2.812-1.544 3.008 0 3.563 1.981 3.563 4.557v5.874h-.755Z"
        fill="#fff"
      />
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

function InstagramIcon({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
      <defs>
        <radialGradient id="ig-a" cx="30%" cy="107%" r="150%">
          <stop offset="0%" stopColor="#fdf497" />
          <stop offset="5%" stopColor="#fdf497" />
          <stop offset="45%" stopColor="#fd5949" />
          <stop offset="60%" stopColor="#d6249f" />
          <stop offset="90%" stopColor="#285AEB" />
        </radialGradient>
      </defs>
      <rect width="24" height="24" rx="6" fill="url(#ig-a)" />
      <path
        d="M12 7.377a4.623 4.623 0 1 0 0 9.246 4.623 4.623 0 0 0 0-9.246Zm0 7.627a3.004 3.004 0 1 1 0-6.008 3.004 3.004 0 0 1 0 6.008Zm5.884-7.818a1.08 1.08 0 1 1-2.16 0 1.08 1.08 0 0 1 2.16 0Z"
        fill="#fff"
      />
      <path
        d="M16.8 4.2H7.2A3 3 0 0 0 4.2 7.2v9.6a3 3 0 0 0 3 3h9.6a3 3 0 0 0 3-3V7.2a3 3 0 0 0-3-3Zm1.44 12.6a1.44 1.44 0 0 1-1.44 1.44H7.2a1.44 1.44 0 0 1-1.44-1.44V7.2A1.44 1.44 0 0 1 7.2 5.76h9.6a1.44 1.44 0 0 1 1.44 1.44v9.6Z"
        fill="#fff"
      />
    </svg>
  )
}

function XIcon({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117Z" />
    </svg>
  )
}

export function PlatformIcon({ platform, className, size = 24 }: PlatformIconProps) {
  const icons: Record<SocialPlatform, React.ReactNode> = {
    youtube: <YouTubeIcon size={size} />,
    tiktok: <TikTokIcon size={size} />,
    linkedin: <LinkedInIcon size={size} />,
    facebook: <FacebookIcon size={size} />,
    instagram: <InstagramIcon size={size} />,
    x: <XIcon size={size} />,
  }

  return (
    <span className={className} aria-hidden>
      {icons[platform]}
    </span>
  )
}
