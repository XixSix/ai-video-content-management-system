import { NextResponse, type NextRequest } from "next/server"

import { MOCK_AUTH_COOKIE_NAME } from "@/features/auth/auth.constants"
import { getSafeRedirectPath } from "@/features/auth/auth.utils"

const authPaths = new Set(["/login", "/signup"])
const protectedExactPaths = new Set([
  "/",
  "/media-library",
  "/studio",
  "/text-to-speech",
  "/publishing",
  "/settings",
  "/long-to-short",
])

function isProtectedPath(pathname: string) {
  return protectedExactPaths.has(pathname) || pathname.startsWith("/editor/")
}

function buildPathWithSearch(request: NextRequest) {
  return `${request.nextUrl.pathname}${request.nextUrl.search}`
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasSession = request.cookies.get(MOCK_AUTH_COOKIE_NAME)?.value === "1"

  if (authPaths.has(pathname) && hasSession) {
    const redirectTo = getSafeRedirectPath(
      request.nextUrl.searchParams.get("next")
    )
    return NextResponse.redirect(new URL(redirectTo, request.url))
  }

  if (isProtectedPath(pathname) && !hasSession) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("next", buildPathWithSearch(request))
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/",
    "/media-library",
    "/studio",
    "/text-to-speech",
    "/publishing",
    "/settings",
    "/long-to-short",
    "/editor/:path*",
    "/login",
    "/signup",
  ],
}
