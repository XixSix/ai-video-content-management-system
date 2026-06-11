"use client"

import { studioRailItems } from "@/features/studio/studio.data"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export function StudioRail() {
  return (
    <aside className="flex h-full w-[78px] shrink-0 flex-col items-center gap-1 border-r border-border bg-surface-raised px-2 py-4">
      {studioRailItems.map((item) => (
        <Tooltip key={item.id}>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex w-full flex-col items-center gap-1 rounded-xl px-1.5 py-2 text-center text-[11px] font-medium transition-colors",
                item.isActive
                  ? "bg-muted text-foreground shadow-[inset_0_0_0_1px_var(--border)]"
                  : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
              )}
              aria-current={item.isActive ? "page" : undefined}
            >
              <item.icon className="size-4" />
              <span className="leading-tight">{item.label}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">{item.label}</TooltipContent>
        </Tooltip>
      ))}
    </aside>
  )
}
