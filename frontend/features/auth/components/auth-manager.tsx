"use client"

import { GalleryVerticalEndIcon } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAuthStore } from "../auth.store"
import { AuthForm } from "./auth-form"

export function AuthManager() {
  const isOpen = useAuthStore((state) => state.isManagerOpen)
  const mode = useAuthStore((state) => state.mode)
  const setManagerOpen = useAuthStore((state) => state.setManagerOpen)
  const setMode = useAuthStore((state) => state.setMode)

  return (
    <Dialog open={isOpen} onOpenChange={setManagerOpen}>
      <DialogContent
        className="w-full max-w-sm gap-6 border-none bg-transparent p-0 text-foreground shadow-none ring-0 sm:max-w-sm"
        showCloseButton={false}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>
            {mode === "signup" ? "Create account" : "Sign in"}
          </DialogTitle>
          <DialogDescription>
            Sign in or create a VidPilot account to access the workspace.
          </DialogDescription>
        </DialogHeader>
        <div className="flex w-full items-center justify-center gap-2 font-medium">
          <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GalleryVerticalEndIcon className="size-4" />
          </div>
          VidPilot
        </div>
        <AuthForm mode={mode} onModeChange={setMode} />
      </DialogContent>
    </Dialog>
  )
}
