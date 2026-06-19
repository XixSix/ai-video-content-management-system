import { GalleryVerticalEndIcon } from "lucide-react"
import { Suspense } from "react"

import type { AuthMode } from "../auth.types"
import { GuestRoute } from "./auth-guard"
import { AuthForm } from "./auth-form"

type AuthPageProps = {
  mode: AuthMode
}

export function AuthPage({ mode }: AuthPageProps) {
  return (
    <Suspense fallback={null}>
      <GuestRoute>
        <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
          <div className="flex w-full max-w-sm flex-col gap-6">
            <div className="flex items-center justify-center gap-2 font-medium">
              <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <GalleryVerticalEndIcon className="size-4" />
              </div>
              VidPilot
            </div>
            <AuthForm mode={mode} />
          </div>
        </div>
      </GuestRoute>
    </Suspense>
  )
}
