import type { WorkspaceRole } from "./workspace.types"

export function canInviteWorkspaceMembers(role: WorkspaceRole): boolean {
  return role === "OWNER"
}

export function getWorkspaceInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")
}
