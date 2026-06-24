import type { QueryClient } from "@tanstack/react-query";

import type { AuthenticatedUser, AuthResponseData } from "../types/auth.types";
import { useAuthStore } from "../store/auth.store";
import { authQueryKeys } from "./auth-query-keys";

export function setAuthenticatedSession(
  queryClient: QueryClient,
  session: AuthResponseData,
): void {
  queryClient.setQueryData<AuthenticatedUser | null>(
    authQueryKeys.session,
    session.user,
  );
  useAuthStore.getState().setAuthenticated(session.accessToken);
}

export function updateAuthSessionWorkspace(
  queryClient: QueryClient,
  workspaceId: string,
): void {
  queryClient.setQueryData<AuthenticatedUser | null>(
    authQueryKeys.session,
    (current) => (current ? { ...current, workspaceId } : current),
  );
}

export async function clearAuthSession(
  queryClient: QueryClient,
): Promise<void> {
  await queryClient.cancelQueries({ queryKey: authQueryKeys.all });
  queryClient.setQueryData<AuthenticatedUser | null>(
    authQueryKeys.session,
    null,
  );
  useAuthStore.getState().setAnonymous();
}
