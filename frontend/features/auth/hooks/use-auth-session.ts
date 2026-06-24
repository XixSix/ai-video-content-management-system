"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import type { AuthenticatedUser } from "../types/auth.types";
import { authService } from "../services/auth.service";
import { useAuthStore } from "../store/auth.store";
import { authQueryKeys } from "./auth-query-keys";

export function useAuthSession() {
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated);
  const setAnonymous = useAuthStore((state) => state.setAnonymous);
  const query = useQuery<AuthenticatedUser | null>({
    queryKey: authQueryKeys.session,
    queryFn: async () => {
      const accessToken = await authService.refreshAccessToken();
      useAuthStore.getState().setAccessToken(accessToken);

      const { user } = await authService.getCurrentUser();

      return user;
    },
    staleTime: Number.POSITIVE_INFINITY,
  });

  useEffect(() => {
    if (query.data) {
      const accessToken = useAuthStore.getState().accessToken;

      if (accessToken) {
        setAuthenticated(accessToken);
      }
      return;
    }

    if (query.isError) {
      setAnonymous();
    }
  }, [query.data, query.isError, setAnonymous, setAuthenticated]);

  return query;
}
