import type { JwtPayload } from 'jsonwebtoken'
import type {
  Prisma,
  User,
  UserRole,
  UserStatus,
  WorkspaceMemberRole
} from '../../infrastructure/db/generated/prisma/client'

export interface AuthenticatedUser {
  id: string
  email: string
  role: UserRole
  status: UserStatus
}

export interface WorkspaceAuthenticatedUser extends AuthenticatedUser {
  workspaceId: string
}

export interface WorkspaceContext {
  id: string
  role: WorkspaceMemberRole
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
  workspaceId: string
}

export interface RefreshResult {
  accessToken: string
}

export interface AuthResponseData {
  accessToken: string
  user: WorkspaceAuthenticatedUser
}

export interface RegisteredUserResult {
  user: User
  workspaceId: string
}

export interface AccessTokenResponseData {
  accessToken: string
}

export interface MessageResponseData {
  message: string
}

export interface SessionTokenResult {
  jti: string
  refreshToken: string
  refreshExpiresAt: Date
}

export interface AccessTokenPayload extends JwtPayload {
  type: 'access'
  userId: string
}

export interface RefreshTokenPayload extends JwtPayload {
  exp: number
  jti: string
  sub: string
  type: 'refresh'
}

export type AuthSessionWithUser = Prisma.AuthSessionGetPayload<{
  include: {
    user: true
  }
}>
