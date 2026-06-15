import { DEFAULT_AUTH_REDIRECT_PATH } from "./auth.constants"

const authPaths = new Set(["/login", "/signup"])

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
