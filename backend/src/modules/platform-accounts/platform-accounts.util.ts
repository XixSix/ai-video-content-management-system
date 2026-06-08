import crypto from 'node:crypto'
import { config } from '../../config'
import { Platform } from '../../infrastructure/db/generated/prisma/client'
import type { PlatformRoute } from './platform-accounts.schema'

type RedirectStatus = 'connected' | 'failed'

const getTokenEncryptionKey = (): Buffer => Buffer.from(config.platform.tokenEncryptionKey, 'base64')
export const resolvePlatform = (platformRoute: PlatformRoute): Platform => {
  if (platformRoute === 'YOUTUBE') {
    return Platform.YOUTUBE
  }

  throw new Error(`Unsupported platform route: ${platformRoute}`)
}

export const generateOAuthState = (): string => crypto.randomBytes(32).toString('base64url')

export const hashOAuthState = (state: string): string => crypto.createHash('sha256').update(state).digest('hex')

export const encryptToken = (token: string): string => {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', getTokenEncryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return ['v1', iv.toString('base64url'), authTag.toString('base64url'), encrypted.toString('base64url')].join(':')
}

export const decryptToken = (encryptedToken: string): string => {
  const [version, ivEncoded, authTagEncoded, ciphertextEncoded] = encryptedToken.split(':')

  if (version !== 'v1' || !ivEncoded || !authTagEncoded || !ciphertextEncoded) {
    throw new Error('Invalid encrypted token format')
  }

  const decipher = crypto.createDecipheriv('aes-256-gcm', getTokenEncryptionKey(), Buffer.from(ivEncoded, 'base64url'))
  decipher.setAuthTag(Buffer.from(authTagEncoded, 'base64url'))

  const decrypted = Buffer.concat([decipher.update(Buffer.from(ciphertextEncoded, 'base64url')), decipher.final()])

  return decrypted.toString('utf8')
}

export const getTokenLast4 = (token: string | null | undefined): string | null => {
  if (!token) {
    return null
  }

  return token.slice(-4)
}

export const isExpired = (expiresAt: Date): boolean => expiresAt.getTime() <= Date.now()

export const buildPlatformOauthRedirectUrl = (
  platformRoute: PlatformRoute,
  status: RedirectStatus,
  code?: string
): string => {
  const redirectUrl = new URL(config.platform.frontendOauthRedirectUrl)
  redirectUrl.searchParams.set('platform', platformRoute)
  redirectUrl.searchParams.set('status', status)

  if (code) {
    redirectUrl.searchParams.set('code', code)
  }

  return redirectUrl.toString()
}
