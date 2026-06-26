import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import type { AuthenticatedUser } from "@/features/auth/types/auth.types";
import { authQueryKeys } from "@/features/auth/hooks/auth-query-keys";
import { updateAuthSessionWorkspace } from "@/features/auth/hooks/auth-session-cache";

import { workspaceQueryKeys } from "./hooks/workspace-query-keys";
import {
  canInviteWorkspaceMembers,
  getWorkspaceInitials,
} from "./workspace.utils";

describe("workspace boundaries", () => {
  it("updates the auth session cache when the selector changes workspace", () => {
    const queryClient = new QueryClient();
    const user: AuthenticatedUser = {
      id: "user-id",
      email: "creator@example.com",
      role: "USER",
      status: "ACTIVE",
      workspaceId: "workspace-a",
    };
    queryClient.setQueryData(authQueryKeys.session, user);

    updateAuthSessionWorkspace(queryClient, "workspace-b");

    expect(
      queryClient.getQueryData<AuthenticatedUser>(authQueryKeys.session)
        ?.workspaceId,
    ).toBe("workspace-b");
  });

  it("keeps members caches isolated by workspace", () => {
    expect(workspaceQueryKeys.members("workspace-a")).not.toEqual(
      workspaceQueryKeys.members("workspace-b"),
    );
  });

  it("allows owners to invite while members remain read-only", () => {
    expect(canInviteWorkspaceMembers("OWNER")).toBe(true);
    expect(canInviteWorkspaceMembers("MEMBER")).toBe(false);
  });

  it("builds compact workspace and member initials", () => {
    expect(getWorkspaceInitials("Creator Team")).toBe("CT");
    expect(getWorkspaceInitials("member@example.com")).toBe("M");
  });
});
