import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import type { ConnectedAccount } from "../social-accounts.types"
import { PlatformIcon } from "./platform-icon"

type ConnectedAccountRowProps = {
  account: ConnectedAccount
  onRemove: (id: string) => void
}

export function ConnectedAccountRow({
  account,
  onRemove,
}: ConnectedAccountRowProps) {
  const initials = account.displayName
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/70 px-3 py-3 transition-colors last:border-b-0 hover:bg-muted/30">
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative shrink-0">
          <Avatar className="size-9">
            <AvatarFallback className="bg-muted text-xs font-medium text-muted-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="absolute -bottom-0.5 -right-0.5">
            <PlatformIcon platform={account.platform} size={16} />
          </span>
        </div>

        <span className="truncate text-sm font-medium text-foreground">
          {account.displayName}
        </span>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="shrink-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
        onClick={() => onRemove(account.id)}
      >
        Remove
      </Button>
    </div>
  )
}
