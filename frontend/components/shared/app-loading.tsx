import { LoaderCircle } from "lucide-react"

import { cn } from "@/lib/utils"

type AppLoadingProps = {
  label?: string
  className?: string
}

export function AppLoading({
  className,
  label = "Loading ...",
}: AppLoadingProps) {
  return (
    <div
      className={cn(
        "flex min-h-svh items-center justify-center bg-background text-foreground",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-card px-4 py-3 text-sm font-medium text-muted-foreground shadow-[var(--shadow-panel)]">
        <LoaderCircle className="size-4 animate-spin text-foreground" />
        <span>{label}</span>
      </div>
    </div>
  )
}
