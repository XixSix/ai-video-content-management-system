import { CloudUpload, Library } from "lucide-react"

import { Button } from "@/components/ui/button"

export function MediaUploadActions() {
  return (
    <>
      <div className="rounded-lg border border-dashed border-border bg-background px-4 py-8 text-center">
        <CloudUpload className="mx-auto size-6 text-muted-foreground" />
        <p className="mt-3 text-xs font-medium text-muted-foreground">
          Drag files here or click to upload
        </p>
      </div>

      <Button
        type="button"
        variant="outline"
        size="lg"
        className="mt-4 w-full"
      >
        <Library className="size-4" />
        Imported from Media Library
      </Button>
    </>
  )
}
