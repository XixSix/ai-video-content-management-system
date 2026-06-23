"use client"

import { useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"
import { platformAccountsQueryKeys } from "./platform-accounts-query-keys"

export function useOAuthCallback(workspaceId: string | null) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const processed = useRef(false)

  useEffect(() => {
    if (processed.current) return

    const platform = searchParams.get("platform")
    const status = searchParams.get("status")

    if (!platform || !status) {
      // Not an OAuth callback, or missing params
      return
    }

    processed.current = true

    if (status === "connected") {
      toast.success("Account connected", {
        description: `Successfully connected ${platform.toLowerCase()} account.`,
      })
      if (workspaceId) {
        queryClient.invalidateQueries({
          queryKey: platformAccountsQueryKeys.list(workspaceId),
        })
      }
    } else {
      const error = searchParams.get("code") || "Failed to connect account"
      toast.error("Connection failed", {
        description: error,
      })
    }

    const returnTo = localStorage.getItem("oauth_return_to") || "/"
    localStorage.removeItem("oauth_return_to")
    router.replace(returnTo)
  }, [searchParams, router, workspaceId, queryClient])
}
