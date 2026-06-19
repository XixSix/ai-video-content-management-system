import { HeadBucketCommand } from '@aws-sdk/client-s3'
import { config } from '../../config'
import { prisma } from '../../infrastructure/db/prisma'
import { getRabbitMQConnection } from '../../infrastructure/rabbitmq/client'
import { getRedisClient } from '../../infrastructure/redis/client'
import { s3Client } from '../../infrastructure/s3/client'

export const checkDatabaseConnection = async (): Promise<void> => {
  await prisma.$queryRaw`SELECT 1`
}

export const checkRedisConnection = async (): Promise<void> => {
  const result = await getRedisClient().ping()

  if (result !== 'PONG') {
    throw new Error('Redis ping returned an unexpected response')
  }
}

export const checkRabbitMQConnection = async (): Promise<void> => {
  const channel = await getRabbitMQConnection().createChannel()
  await channel.close()
}

export const checkObjectStorageConnection = async (): Promise<void> => {
  await s3Client.send(
    new HeadBucketCommand({
      Bucket: config.s3.bucket
    })
  )
}
