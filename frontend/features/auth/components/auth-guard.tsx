"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, type ReactNode } from "react"

import { AppLoading } from "@/components/shared/app-loading"

import { getSafeRedirectPath } from "../utils/auth.utils"
import { useAuthStore } from "../store/auth.store"

function AuthLoadingScreen() {
  return <AppLoading label="Loading session..." />
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const status = useAuthStore((state) => state.status)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (status !== "anonymous") {
      return
    }

    const nextPath = `${pathname}${window.location.search}`
    router.replace(`/login?next=${encodeURIComponent(nextPath)}`)
  }, [pathname, router, status])

  if (status !== "authenticated") {
    return <AuthLoadingScreen />
  }

  return children
}

export function GuestRoute({ children }: { children: ReactNode }) {
  const status = useAuthStore((state) => state.status)
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(getSafeRedirectPath(searchParams.get("next")))
    }
  }, [router, searchParams, status])

  if (status !== "anonymous") {
    return <AuthLoadingScreen />
  }

  return children
}
