export type AuthMode = "login" | "signup"

export type AuthStatus = "initializing" | "authenticated" | "anonymous"

export type AuthenticatedUser = {
  id: string
  email: string
  role: "USER" | "ADMIN"
  status: "ACTIVE" | "DISABLED"
}

export type AuthResponseData = {
  accessToken: string
  user: AuthenticatedUser
}

export type AccessTokenResponseData = {
  accessToken: string
}

export type CurrentUserResponseData = {
  user: AuthenticatedUser
}

export type MessageResponseData = {
  message: string
}
