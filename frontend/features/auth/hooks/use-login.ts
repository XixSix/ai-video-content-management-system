"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"

import { authService } from "../services/auth.service"
import { setAuthenticatedSession } from "./auth-session-cache"

export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: authService.login,
    onSuccess: (session) => {
      setAuthenticatedSession(queryClient, session)
    },
  })
}
