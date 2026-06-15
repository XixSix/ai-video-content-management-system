"use client"

import { Bell, CheckCircle2, Clock3, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const headerNotifications = [
  {
    id: "transcript-ready",
    title: "Transcript ready",
    description: "Quarterly Product Launch Keynote is ready for review.",
    time: "2m ago",
    icon: CheckCircle2,
    unread: true,
  },
  {
    id: "clips-generated",
    title: "Clip candidates generated",
    description: "3 short clips are waiting in Studio.",
    time: "18m ago",
    icon: Sparkles,
    unread: true,
  },
  {
    id: "publish-scheduled",
    title: "Publish scheduled",
    description: "TikTok post queued for this afternoon.",
    time: "1h ago",
    icon: Clock3,
    unread: false,
  },
]

export function HeaderNotifications() {
  const unreadCount = headerNotifications.filter((item) => item.unread).length

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="relative"
              aria-label="Open notifications"
            >
              <Bell className="size-4" />
              {unreadCount > 0 ? (
                <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-destructive ring-2 ring-background" />
              ) : null}
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent sideOffset={6}>Notifications</TooltipContent>
      </Tooltip>

      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2.5">
          <DropdownMenuLabel className="p-0 text-sm text-foreground">
            Notifications
          </DropdownMenuLabel>
          <span className="text-xs text-muted-foreground">
            {unreadCount} unread
          </span>
        </div>
        <DropdownMenuSeparator className="m-0" />
        <div className="max-h-80 overflow-y-auto p-1">
          {headerNotifications.map((item) => {
            const Icon = item.icon

            return (
              <div
                key={item.id}
                className={cn(
                  "flex gap-3 rounded-md px-2.5 py-2.5 text-sm outline-none transition hover:bg-accent",
                  item.unread && "bg-muted/45"
                )}
              >
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background">
                  <Icon className="size-4 text-muted-foreground" />
                </span>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium leading-5 text-foreground">
                      {item.title}
                    </p>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {item.time}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
