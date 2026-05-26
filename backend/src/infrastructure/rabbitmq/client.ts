import * as amqp from 'amqplib'
import type { ChannelModel } from 'amqplib'
import { config } from '../../config'

let rabbitMQConnection: ChannelModel | null = null
let pendingConnection: Promise<ChannelModel> | null = null

export const connectRabbitMQ = async (): Promise<ChannelModel> => {
  if (rabbitMQConnection) {
    return rabbitMQConnection
  }

  if (pendingConnection) {
    return pendingConnection
  }

  pendingConnection = amqp.connect(config.rabbitmq.url)

  try {
    const connection = await pendingConnection
    rabbitMQConnection = connection

    connection.on('error', (error: Error) => {
      console.error('RabbitMQ connection error', error)
    })

    connection.on('close', () => {
      rabbitMQConnection = null
    })

    return connection
  } finally {
    pendingConnection = null
  }
}

export const getRabbitMQConnection = (): ChannelModel => {
  if (!rabbitMQConnection) {
    throw new Error('RabbitMQ is not connected')
  }

  return rabbitMQConnection
}

export const disconnectRabbitMQ = async (): Promise<void> => {
  if (!rabbitMQConnection) {
    return
  }

  const connection = rabbitMQConnection
  rabbitMQConnection = null
  await connection.close()
}
