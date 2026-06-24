"use client"

import { LogOut, UserRound } from "lucide-react"
import { useRouter } from "next/navigation"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuthSession } from "@/features/auth/hooks/use-auth-session"
import { useLogout } from "@/features/auth/hooks/use-logout"
import {
  getEmailDisplayName,
  getEmailInitials,
} from "@/features/auth/utils/auth.utils"

export function HeaderAccountMenu() {
  const router = useRouter()
  const { data: user } = useAuthSession()
  const logoutMutation = useLogout()
  const email = user?.email ?? "user@example.com"

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync()
    } catch {
      // Local auth state must still be cleared when the server is unavailable.
    } finally {
      router.replace("/login")
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="rounded-full"
          aria-label="Open account menu"
        >
          <Avatar size="sm">
            <AvatarFallback className="bg-primary/10 text-primary">
              {getEmailInitials(email)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-sm font-medium text-foreground">
              {getEmailDisplayName(email)}
            </span>
            <span className="truncate text-xs font-normal text-muted-foreground">
              {email}
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <UserRound className="size-4" />
          Account
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={logoutMutation.isPending}
          onClick={handleLogout}
        >
          <LogOut className="size-4" />
          {logoutMutation.isPending ? "Logging out..." : "Log out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
