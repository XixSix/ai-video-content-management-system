import type { ReactNode } from "react"

import { ProtectedRoute } from "@/features/auth/components/auth-guard"

export default function PrivateLayout({ children }: { children: ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>
}
