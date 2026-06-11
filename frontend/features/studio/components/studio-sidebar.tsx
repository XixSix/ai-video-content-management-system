"use client"

import { StudioPanel } from "@/features/studio/components/studio-panel"
import { StudioRail } from "@/features/studio/components/studio-rail"

export function StudioSidebar() {
  return (
    <aside className="grid h-full min-h-0 w-[326px] shrink-0 overflow-hidden grid-cols-[78px_248px]">
      <StudioRail />
      <StudioPanel />
    </aside>
  )
}
