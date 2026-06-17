"use client"

import { FolderOpen } from "lucide-react"

import { StudioPanelShell } from "@/features/studio-editor/tool-panel/components/studio-panel-shell"

export function StudioAssetsPanel() {
  return (
    <StudioPanelShell title="Assets">
      <div className="flex flex-1 flex-col p-4">
        <div className="rounded-xl border border-dashed border-border bg-surface-muted/40 px-4 py-8 text-center">
          <FolderOpen className="mx-auto size-6 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium text-foreground">Assets placeholder</p>
        </div>
      </div>
    </StudioPanelShell>
  )
}
