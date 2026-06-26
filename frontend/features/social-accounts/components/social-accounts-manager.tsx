"use client"

import { SocialAccountsWorkspace } from "./social-accounts-workspace"
import { useSocialAccountsStore } from "../social-accounts.store"

export function SocialAccountsManager() {
  const isOpen = useSocialAccountsStore((state) => state.isManagerOpen)
  const setManagerOpen = useSocialAccountsStore((state) => state.setManagerOpen)

  return (
    <SocialAccountsWorkspace open={isOpen} onOpenChange={setManagerOpen} />
  )
}
