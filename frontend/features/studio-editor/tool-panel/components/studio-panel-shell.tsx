"use client"

import type { ReactNode } from "react"
import { Ellipsis } from "lucide-react"

import { Button } from "@/components/ui/button"

type StudioPanelShellProps = {
  children: ReactNode
  headerActions?: ReactNode
  title: string
}

export function StudioPanelShell({
  children,
  headerActions,
  title,
}: StudioPanelShellProps) {
  return (
    <aside className="flex h-full min-h-0 w-full flex-col overflow-hidden border-r border-border bg-background">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <div className="flex items-center gap-1">
          {headerActions}
          <Button variant="ghost" size="icon-xs" aria-label="More panel actions">
            <Ellipsis />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-auto">{children}</div>
    </aside>
  )
}
