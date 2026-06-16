"use client"

import { Type } from "lucide-react"

import type { StudioCanvasLayer } from "@/features/studio-editor/studio.types"
import { useStudioSelectionState } from "@/features/studio-editor/store/studio-editor-store"
import { cn } from "@/lib/utils"

export function TextLayerButton({ layer }: { layer: StudioCanvasLayer }) {
  const { selectedTargetId, setSelectedItemId } = useStudioSelectionState()
  const isSelected = selectedTargetId === layer.id

  return (
    <button
      type="button"
      onClick={() => setSelectedItemId(layer.id)}
      className={cn(
        "w-full rounded-lg border bg-background px-3 py-3 text-left transition",
        isSelected
          ? "border-sky-500/45 shadow-[0_0_0_1px_rgba(14,165,233,0.22)]"
          : "border-border hover:border-foreground/18 hover:bg-surface-muted/35"
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg border",
            isSelected
              ? "border-sky-500/24 bg-sky-500/12 text-sky-700 dark:text-sky-300"
              : "border-border bg-surface-muted text-muted-foreground"
          )}
        >
          <Type className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {layer.content ?? layer.label}
          </p>
        </div>
      </div>
    </button>
  )
}
