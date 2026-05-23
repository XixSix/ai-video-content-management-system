import type { AuthSession, User, UserStatus, UserRole } from '../infrastructure/db/generated/prisma/client'
import type { JwtPayload } from 'jsonwebtoken'

export interface AuthenticatedUser {
  id: string
  email: string
  role: UserRole
  status: UserStatus
}

export interface RequestMetadata {
  userAgent?: string
  ipAddress?: string
}

export interface RequestMetadataSource {
  ip?: string
  header(name: string): string | undefined
}

export interface AuthResult {
  accessToken: string
  refreshToken: string
  refreshExpiresAt: Date
  user: User
}

export interface AuthResponseData {
  accessToken: string
  user: AuthenticatedUser
}

export interface AccessTokenResponseData {
  accessToken: string
}

export interface MessageResponseData {
  message: string
}

export interface SessionTokenResult {
  refreshToken: string
  refreshExpiresAt: Date
}

export interface AccessTokenPayload extends JwtPayload {
  userId: string
}

export interface AuthSessionWithUser extends AuthSession {
  user: User
}
