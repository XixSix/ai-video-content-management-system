"use client"

import { useState } from "react"
import { Check, ChevronDown, LayoutGrid, Plus, Loader2 } from "lucide-react"

import { useWorkspace } from "@/features/workspaces/components/workspace-provider"
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
  platformFilterOptions,
  platformInfoList,
} from "../social-accounts.data"
import {
  useConnectPlatform,
  useDisconnectPlatform,
  usePlatformAccounts,
} from "../hooks/use-platform-accounts"
import type {
  BackendPlatform,
  PlatformFilterValue,
} from "../social-accounts.types"
import { AddPlatformCard } from "./add-platform-card"
import { ConnectedAccountRow } from "./connected-account-row"
import { PlatformIcon } from "./platform-icon"

type SocialAccountsWorkspaceProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SocialAccountsWorkspace({
  open,
  onOpenChange,
}: SocialAccountsWorkspaceProps) {
  const { selectedWorkspaceId, selectedWorkspace } = useWorkspace()
  const isOwner = selectedWorkspace?.role === "OWNER"

  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [filterValue, setFilterValue] = useState<PlatformFilterValue>("all")

  const { data: accountsData, isLoading: isAccountsLoading } = usePlatformAccounts(
    selectedWorkspaceId ?? "",
    open
  )
  const connectMutation = useConnectPlatform(selectedWorkspaceId ?? "")
  const disconnectMutation = useDisconnectPlatform(selectedWorkspaceId ?? "")

  const accounts = accountsData?.accounts ?? []

  const selectedFilterLabel =
    platformFilterOptions.find((option) => option.value === filterValue)?.label ??
    "All platforms"

  const filteredAccounts = accounts.filter((account) => {
    if (filterValue === "all") return true
    const platformInfo = platformInfoList.find((p) => p.id === filterValue)
    return platformInfo?.backendId === account.platform
  })

  const handleRemoveAccount = (backendId: BackendPlatform) => {
    disconnectMutation.mutate(backendId)
  }

  const handleConnectPlatform = (backendId: BackendPlatform) => {
    connectMutation.mutate(backendId)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen)

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
              {isAccountsLoading ? (
                <div className="flex min-h-[26rem] items-center justify-center">
                  <Loader2 className="size-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredAccounts.length > 0 ? (
                filteredAccounts.map((account) => (
                  <ConnectedAccountRow
                    key={account.id}
                    account={account}
                    onRemove={handleRemoveAccount}
                    isRemoving={
                      disconnectMutation.isPending &&
                      disconnectMutation.variables === account.platform
                    }
                    disabled={!isOwner}
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
              disabled={!isOwner}
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
                  const isConnected = platform.backendId
                    ? accounts.some(
                        (account) => account.platform === platform.backendId && account.status === "CONNECTED"
                      )
                    : false

                  const isConnecting =
                    connectMutation.isPending &&
                    connectMutation.variables === platform.backendId

                  return (
                    <AddPlatformCard
                      key={platform.id}
                      platform={platform}
                      disabled={isConnected}
                      isConnecting={isConnecting}
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
