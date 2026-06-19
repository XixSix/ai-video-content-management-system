"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { authService } from "../services/auth.service"
import { clearAuthSession } from "./auth-session-cache"

export function useLogoutAll() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: authService.logoutAll,
    onSettled: async () => {
      await clearAuthSession(queryClient)
    },
  })
}
