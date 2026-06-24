"use client"

import { Loader2 } from "lucide-react"
import { useWorkspace } from "@/features/workspaces/components/workspace-provider"
import { useOAuthCallback } from "@/features/social-accounts/hooks/use-oauth-callback"

export default function SocialAccountsCallbackPage() {
  const { selectedWorkspaceId } = useWorkspace()
  useOAuthCallback(selectedWorkspaceId)

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4 text-muted-foreground">
      <Loader2 className="size-8 animate-spin" />
      <p>Finalizing connection...</p>
    </div>
  )
}
