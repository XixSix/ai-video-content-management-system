import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { MediaLibraryViewMode } from "../media-library.types"

type MediaLibraryLoadingProps = {
  viewMode: MediaLibraryViewMode
}

export function MediaLibraryLoading({
  viewMode,
}: MediaLibraryLoadingProps) {
  if (viewMode === "list") {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="border-border/70 bg-card/95 py-0">
            <CardContent className="p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                <Skeleton className="aspect-video w-full max-w-48 rounded-xl lg:w-48" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-5 w-56" />
                  <Skeleton className="h-4 w-72" />
                  <Skeleton className="h-4 w-48" />
                  <div className="flex flex-wrap gap-2">
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                </div>
                <Skeleton className="h-8 w-32 rounded-lg" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <Card key={index} className="border-border/70 bg-card/95 py-0">
          <Skeleton className="m-3 aspect-video rounded-lg" />
          <CardHeader className="gap-3 pb-3">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-3/4" />
          </CardHeader>
          <CardContent className="space-y-3 pb-4">
            <Skeleton className="h-5 w-36 rounded-full" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </CardContent>
          <CardFooter className="justify-between gap-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-28 rounded-lg" />
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
