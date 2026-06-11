"use client"

import { StudioRail } from "@/features/studio-editor/components/studio-rail"

export function StudioSidebar() {
  return (
    <aside className="h-full min-h-0 w-[78px] shrink-0 overflow-hidden">
      <StudioRail />
    </aside>
  )
}
