import { Loader2 } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

import type { BackendPlatform, PlatformAccountData } from "../social-accounts.types"
import { platformInfoList } from "../social-accounts.data"
import { PlatformIcon } from "./platform-icon"

type ConnectedAccountRowProps = {
  account: PlatformAccountData
  onRemove: (platform: BackendPlatform) => void
  isRemoving?: boolean
  disabled?: boolean
}

export function ConnectedAccountRow({
  account,
  onRemove,
  isRemoving = false,
  disabled = false,
}: ConnectedAccountRowProps) {
  const platformInfo = platformInfoList.find(
    (info) => info.backendId === account.platform
  )
  const platformName = platformInfo?.name || account.platform
  const displayName = account.accountName || platformName
  const initials = displayName
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
  
  const platformId = platformInfo?.id || "youtube"

  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/70 px-3 py-3 transition-colors last:border-b-0 hover:bg-muted/30">
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative shrink-0">
          <Avatar className="size-9">
            {account.avatarUrl ? (
              <AvatarImage src={account.avatarUrl} alt={displayName} />
            ) : null}
            <AvatarFallback className="bg-muted text-xs font-medium text-muted-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="absolute -bottom-0.5 -right-0.5">
            <PlatformIcon platform={platformId} size={16} />
          </span>
        </div>

        <div className="flex flex-col min-w-0">
          <span className="truncate text-sm font-medium text-foreground">
            {displayName}
          </span>
          {account.status !== "CONNECTED" && (
            <span className="truncate text-[11px] text-destructive font-medium">
              {account.status === "EXPIRED" ? "Connection expired" : "Revoked"}
            </span>
          )}
        </div>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="shrink-0 text-muted-foreground hover:bg-transparent hover:text-foreground disabled:opacity-50"
        onClick={() => onRemove(account.platform)}
        disabled={isRemoving || disabled}
      >
        {isRemoving ? <Loader2 className="mr-2 size-3 animate-spin" /> : null}
        Remove
      </Button>
    </div>
  )
}
