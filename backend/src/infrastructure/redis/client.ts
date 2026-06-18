import { createClient } from 'redis'
import { config } from '../../config'

const redisClient = createClient({
  url: config.redis.url
})

let pendingConnection: Promise<typeof redisClient> | null = null

redisClient.on('error', (error: Error) => {
  console.error('Redis connection error', error)
})

export const connectRedis = async (): Promise<typeof redisClient> => {
  if (redisClient.isReady) {
    return redisClient
  }

  if (pendingConnection) {
    return pendingConnection
  }

  pendingConnection = redisClient.connect().then(() => redisClient)

  try {
    return await pendingConnection
  } finally {
    pendingConnection = null
  }
}

export const getRedisClient = (): typeof redisClient => {
  if (!redisClient.isReady) {
    throw new Error('Redis is not connected')
  }

  return redisClient
}

export const disconnectRedis = async (): Promise<void> => {
  if (!redisClient.isOpen) {
    return
  }

  await redisClient.quit()
}
