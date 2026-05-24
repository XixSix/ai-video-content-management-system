import type { Options } from 'amqplib'
import { getRabbitMQConnection } from './client'

export const publishJsonToQueue = async (
  queueName: string,
  message: Record<string, unknown>,
  options: Options.Publish = {}
): Promise<void> => {
  const connection = getRabbitMQConnection()
  const channel = await connection.createChannel()

  try {
    await channel.assertQueue(queueName, { durable: true })

    const published = channel.sendToQueue(queueName, Buffer.from(JSON.stringify(message)), {
      contentType: 'application/json',
      persistent: true,
      ...options
    })

    if (!published) {
      throw new Error(`RabbitMQ publish buffer is full for queue ${queueName}`)
    }
  } finally {
    await channel.close()
  }
}
