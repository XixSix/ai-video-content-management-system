import type { PlatformInfo } from "../social-accounts.types"
import { PlatformIcon } from "./platform-icon"
import { Zap } from "lucide-react"

type AddPlatformCardProps = {
  platform: PlatformInfo
  onConnect: (platformId: PlatformInfo["id"]) => void
  disabled?: boolean
}

export function AddPlatformCard({
  platform,
  onConnect,
  disabled = false,
}: AddPlatformCardProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onConnect(platform.id)}
      className="relative flex min-h-28 flex-col items-center justify-center gap-2.5 rounded-xl border border-border/70 bg-card/60 px-4 py-6 text-center transition-all hover:-translate-y-0.5 hover:border-border hover:bg-card hover:shadow-[var(--shadow-panel)] disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 disabled:hover:shadow-none"
    >
      {platform.badgeLabel ? (
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-amber-500/12 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-300">
          <Zap className="size-3" />
        </span>
      ) : null}
      <PlatformIcon platform={platform.id} size={32} />
      <div className="space-y-0.5">
        <p className="text-sm font-semibold text-foreground">{platform.name}</p>
        <p className="text-xs text-muted-foreground">
          {disabled ? "Already connected" : platform.description}
        </p>
      </div>
    </button>
  )
}
