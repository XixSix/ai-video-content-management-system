import type { AuthSession } from '../../infrastructure/db/generated/prisma/client'
import { getRedisClient } from '../../infrastructure/redis/client'
import { AuthError } from './auth.error'

const REFRESH_BLACKLIST_PREFIX = 'auth:refresh:blacklist:'

const getBlacklistKey = (jti: string): string => `${REFRESH_BLACKLIST_PREFIX}${jti}`

const getRemainingTtlSeconds = (expiresAt: Date): number =>
  Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 1000))

export const isRefreshTokenBlacklisted = async (jti: string): Promise<boolean> => {
  try {
    return (await getRedisClient().exists(getBlacklistKey(jti))) === 1
  } catch {
    throw AuthError.sessionStoreUnavailable()
  }
}

export const blacklistRefreshSession = async (jti: string, expiresAt: Date): Promise<void> => {
  const ttlSeconds = getRemainingTtlSeconds(expiresAt)

  if (ttlSeconds === 0) {
    return
  }

  try {
    await getRedisClient().set(getBlacklistKey(jti), '1', {
      expiration: {
        type: 'EX',
        value: ttlSeconds
      }
    })
  } catch {
    throw AuthError.sessionStoreUnavailable()
  }
}

export const blacklistRefreshSessions = async (sessions: AuthSession[]): Promise<void> => {
  const activeSessions = sessions
    .map((session) => ({
      jti: session.jti,
      ttlSeconds: getRemainingTtlSeconds(session.expiresAt)
    }))
    .filter((session) => session.ttlSeconds > 0)

  if (activeSessions.length === 0) {
    return
  }

  try {
    const transaction = getRedisClient().multi()

    for (const session of activeSessions) {
      transaction.set(getBlacklistKey(session.jti), '1', {
        expiration: {
          type: 'EX',
          value: session.ttlSeconds
        }
      })
    }

    await transaction.exec()
  } catch {
    throw AuthError.sessionStoreUnavailable()
  }
}
