export function CaptionsEmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-surface-muted/40 px-4 py-8 text-center">
      <p className="text-sm font-medium text-foreground">No captions match this search.</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Try speaker names or a phrase from the current transcript.
      </p>
    </div>
  )
}
