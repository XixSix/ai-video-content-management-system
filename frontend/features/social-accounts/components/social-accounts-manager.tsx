"use client"

import { useState } from "react"
import { Check, ChevronDown, LayoutGrid, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  connectedAccountsSeed,
  platformFilterOptions,
  platformInfoList,
} from "../social-accounts.data"
import { useSocialAccountsStore } from "../social-accounts.store"
import type {
  ConnectedAccount,
  PlatformFilterValue,
  SocialPlatform,
} from "../social-accounts.types"
import { AddPlatformCard } from "./add-platform-card"
import { ConnectedAccountRow } from "./connected-account-row"
import { PlatformIcon } from "./platform-icon"

function buildProfileUrl(platform: SocialPlatform, displayName: string) {
  const slug = displayName.toLowerCase().replace(/\s+/g, "")

  switch (platform) {
    case "youtube":
      return `https://youtube.com/@${slug}`
    case "tiktok":
      return `https://tiktok.com/@${slug}`
    case "instagram":
      return `https://instagram.com/${slug}`
    case "linkedin":
      return `https://linkedin.com/in/${slug}`
    case "facebook":
      return `https://facebook.com/${slug}`
    case "x":
      return `https://x.com/${slug}`
    default:
      return null
  }
}

export function SocialAccountsManager() {
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [filterValue, setFilterValue] = useState<PlatformFilterValue>("all")
  const [accounts, setAccounts] = useState<ConnectedAccount[]>(
    connectedAccountsSeed
  )
  const isOpen = useSocialAccountsStore((state) => state.isManagerOpen)
  const setManagerOpen = useSocialAccountsStore((state) => state.setManagerOpen)

  const selectedFilterLabel =
    platformFilterOptions.find((option) => option.value === filterValue)?.label ??
    "All platforms"

  const filteredAccounts = accounts.filter((account) =>
    filterValue === "all" ? true : account.platform === filterValue
  )

  const handleRemoveAccount = (id: string) => {
    setAccounts((currentAccounts) =>
      currentAccounts.filter((account) => account.id !== id)
    )
  }

  const handleConnectPlatform = (platform: SocialPlatform) => {
    const selectedPlatform = platformInfoList.find((item) => item.id === platform)

    if (!selectedPlatform) {
      return
    }

    const alreadyConnected = accounts.some((account) => account.platform === platform)

    if (alreadyConnected) {
      setIsPickerOpen(false)
      return
    }

    setAccounts((currentAccounts) => [
      {
        id: `sa-${Date.now()}`,
        platform,
        displayName: selectedPlatform.mockAccountName,
        profileUrl: buildProfileUrl(platform, selectedPlatform.mockAccountName),
        avatarUrl: null,
        connectedAt: new Date().toISOString(),
      },
      ...currentAccounts,
    ])
    setFilterValue("all")
    setIsPickerOpen(false)
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(nextOpen) => {
        setManagerOpen(nextOpen)

        if (!nextOpen) {
          setIsPickerOpen(false)
          setFilterValue("all")
        }
      }}
    >
      <DialogContent
        className="max-w-[28rem] gap-0 overflow-hidden rounded-2xl border-border/80 bg-card p-0"
        showCloseButton
      >
        <DialogHeader className="px-6 pb-3 pr-14 pt-6">
          <DialogTitle className="pr-8">Social account connections</DialogTitle>
          <DialogDescription className="sr-only">
            Manage connected social accounts, filter by platform, remove an
            existing connection, or add a new account for publishing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 pb-6">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="h-10 w-fit min-w-40 justify-between rounded-xl px-3 text-sm font-medium"
              >
                <span className="inline-flex items-center gap-2">
                  <LayoutGrid className="size-4 text-muted-foreground" />
                  {selectedFilterLabel}
                </span>
                <ChevronDown className="size-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48 min-w-48" align="start">
              {platformFilterOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onSelect={() => setFilterValue(option.value)}
                  className="justify-between"
                >
                  <span className="inline-flex items-center gap-2">
                    {option.value === "all" ? (
                      <LayoutGrid className="size-4 text-muted-foreground" />
                    ) : (
                      <PlatformIcon platform={option.value} size={16} />
                    )}
                    {option.label}
                  </span>
                  {option.value === filterValue ? (
                    <Check className="size-4 text-foreground" />
                  ) : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="overflow-hidden rounded-xl border border-border/70 bg-background/40">
            <div className="min-h-[26rem]">
              {filteredAccounts.length > 0 ? (
                filteredAccounts.map((account) => (
                  <ConnectedAccountRow
                    key={account.id}
                    account={account}
                    onRemove={handleRemoveAccount}
                  />
                ))
              ) : (
                <div className="flex min-h-[26rem] flex-col items-center justify-center gap-3 px-6 text-center">
                  <span className="inline-flex size-12 items-center justify-center rounded-2xl border border-border/70 bg-muted/70">
                    <LayoutGrid className="size-5 text-muted-foreground" />
                  </span>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">
                      No connected accounts in this view
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Add a platform connection to start publishing from the
                      workspace.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="rounded-xl px-4"
              onClick={() => setIsPickerOpen(true)}
            >
              <Plus className="size-4" />
              Add account
            </Button>
          </div>
        </div>

        {isPickerOpen ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 px-4 supports-backdrop-filter:backdrop-blur-sm">
            <div className="w-full max-w-[28rem] rounded-2xl border border-border/80 bg-card p-6 shadow-[var(--shadow-panel)]">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-[1.05rem] font-semibold text-foreground">
                    Add social accounts
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Connect one platform at a time for publishing workflows.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="rounded-full"
                  onClick={() => setIsPickerOpen(false)}
                >
                  <span className="sr-only">Close add account picker</span>
                  <Plus className="size-4 rotate-45" />
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {platformInfoList.map((platform) => {
                  const isConnected = accounts.some(
                    (account) => account.platform === platform.id
                  )

                  return (
                    <AddPlatformCard
                      key={platform.id}
                      platform={platform}
                      disabled={isConnected}
                      onConnect={handleConnectPlatform}
                    />
                  )
                })}
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
