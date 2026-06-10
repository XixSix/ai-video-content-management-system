import { LoaderCircle } from "lucide-react"

type MediaLibraryProcessingIndicatorProps = {
  activeJobCount: number
}

export function MediaLibraryProcessingIndicator({
  activeJobCount,
}: MediaLibraryProcessingIndicatorProps) {
  if (activeJobCount < 1) {
    return null
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-700 dark:text-sky-300">
      <LoaderCircle className="size-3.5 animate-spin" />
      {activeJobCount === 1 ? "1 workflow running" : `${activeJobCount} workflows running`}
    </div>
  )
}

