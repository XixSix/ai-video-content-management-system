import { FolderOpen } from "lucide-react"

export function AssetsPlaceholderInspector() {
  return (
    <section className="rounded-xl border border-dashed border-border bg-surface-muted/40 px-4 py-8 text-center">
      <FolderOpen className="mx-auto size-6 text-muted-foreground" />
      <p className="mt-3 text-sm font-medium text-foreground">Assets placeholder</p>
    </section>
  )
}
