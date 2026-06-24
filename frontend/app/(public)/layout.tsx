import { Suspense, type ReactNode } from "react"

import { AppLoading } from "@/components/shared/app-loading"
import { GuestRoute } from "@/features/auth/components/auth-guard"

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<AppLoading label="Loading..." />}>
      <GuestRoute>{children}</GuestRoute>
    </Suspense>
  )
}
