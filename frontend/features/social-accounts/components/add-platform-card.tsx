import { Loader2, Zap } from "lucide-react"

import type { BackendPlatform, PlatformInfo } from "../social-accounts.types"
import { PlatformIcon } from "./platform-icon"

type AddPlatformCardProps = {
  platform: PlatformInfo
  onConnect: (backendId: BackendPlatform) => void
  disabled?: boolean
  isConnecting?: boolean
}

export function AddPlatformCard({
  platform,
  onConnect,
  disabled = false,
  isConnecting = false,
}: AddPlatformCardProps) {
  const isUnsupported = !platform.backendSupported
  const isDisabled = disabled || isUnsupported || isConnecting

  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={() => {
        if (platform.backendId) {
          onConnect(platform.backendId)
        }
      }}
      className="relative flex min-h-28 flex-col items-center justify-center gap-2.5 rounded-xl border border-border/70 bg-card/60 px-4 py-6 text-center transition-all hover:-translate-y-0.5 hover:border-border hover:bg-card hover:shadow-[var(--shadow-panel)] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 disabled:hover:shadow-none"
    >
      {platform.badgeLabel ? (
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-amber-500/12 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-300">
          <Zap className="size-3" />
          {platform.badgeLabel}
        </span>
      ) : null}
      {isConnecting ? (
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      ) : (
        <PlatformIcon platform={platform.id} size={32} />
      )}
      <div className="space-y-0.5">
        <p className="text-sm font-semibold text-foreground">{platform.name}</p>
        <p className="text-xs text-muted-foreground">
          {isConnecting
            ? "Connecting..."
            : disabled
              ? "Already connected"
              : platform.description}
        </p>
      </div>
    </button>
  )
}
