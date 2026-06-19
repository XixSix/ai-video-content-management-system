import { DEFAULT_AUTH_REDIRECT_PATH } from "./auth.constants"

const authPaths = new Set(["/login", "/signup"])

export function getEmailInitials(email: string) {
  const localPart = email.split("@", 1)[0] ?? "user"
  const initials = localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")

  return initials || "U"
}

export function getEmailDisplayName(email: string) {
  const localPart = email.split("@", 1)[0] ?? "User"
  const displayName = localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ")

  return displayName || "User"
}

export function getSafeRedirectPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return DEFAULT_AUTH_REDIRECT_PATH
  }

  const pathname = value.split("?")[0] ?? value

  if (authPaths.has(pathname)) {
    return DEFAULT_AUTH_REDIRECT_PATH
  }

  return value
}
